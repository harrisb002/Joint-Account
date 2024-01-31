pragma solidity ^0.8.0;

/*
    This will support multiple Bank account owners
    Will allow any owner of the account to deposit
    Every owner of the account must approve any withdraw requested 
*/

contract BankAccount {
    event Deposit(
        address indexed user,
        uint indexed accountId,
        uint value,
        uint timestamp
    );
    event WithdrawRequested(
        address indexed user,
        uint indexed accountId,
        uint indexed withdrawId,
        uint amount,
        uint timestamp
    );
    event Withdraw(uint indexed withdrawId, uint timestamp);
    event AccountCreated(address[] owners, uint indexed id, uint timestamp);

    struct WithdrawRequest {
        address user; //Who made the request and who can withdraw the funds upon approval
        uint amount;
        uint approvals; //Once approvals == number of owners then it is approved
        mapping(address => bool) ownersApproved; //Each owner can only approve once
        bool approved;
    }

    struct Account {
        address[] owners;
        uint balance;
        mapping(uint => WithdrawRequest) withdrawRequests;
    }

    mapping(uint => Account) accounts;
    mapping(address => uint[]) userAccounts; //Stores the ID's of the user accounts (Need to know the which accounts the user is a owner of)

    //Incremented upon each account so that each new account has a unique ID
    uint nextAccountId;
    uint nextWithdrawId;

    //Must loop through the owners of the account to see if current Id is an owner of account
    //Used for validating msg.sender is an owner of account
    modifier accountOwner(uint accountId) {
        bool isOwner;
        for (uint idx; idx < accounts[accountId].owners.length; idx++) {
            if (accounts[accountId].owners[idx] == msg.sender) {
                //Check if the person sending the tx is an owner
                isOwner = true;
                break;
            }
        }
        require(isOwner, "This address is not an owner of this account");
        _;
    }

    modifier validOwners(address[] calldata owners) {
        require(owners.length + 1 <= 4); //Other owners that is passed not including the owner of the current tx
        //Check for duplicated owners inside the array
        for (uint i; i < owners.length; i++) {
            for (uint j = i + 1; j < owners.length; j++) {
                if (owners[i] == owners[j]) {
                    revert("Duplicate owners not allowed");
                }
            }
        }
        _;
    }

    //Checks for a sufficient balance before withdraw
    modifier sufficientBalance(uint accountId, uint amount) {
        require(
            accounts[accountId].balance >= amount,
            "Not sufficient balance, tx failed."
        );
        _;
    }

    //Must check for prerequisites concerning ability to approve withdrawls being made on given account
    modifier canApprove(uint accountId, uint withdrawId) {
        require(
            accounts[accountId].withdrawRequests[withdrawId].user != msg.sender,
            "Request has already been approved."
        );
        require(
            !accounts[accountId].withdrawRequest[withdrawId].approve,
            "Not permitted to approve this request."
        );
        require(
            accounts[accountId].withdrawRequests[withdrawId].user != address(0),
            "This request has not been created."
        );
        require(
            !accounts[accountId].withdrawRequests[withdrawId].ownersApproved[
                msg.sender
            ] != msg.sender,
            "You've approved this request already."
        );
        _;
    }

    //Prerequisites to withdraw from a given account and withdraw request
    modifier canWithdraw(uint accountId, uint withdrawId) {
        require(accounts[accountId].withdrawRequests[withdrawId].user == msg.sender, "You are not the owner of this request.");
        require(accounts[accountId].withdrawRequests[withdrawId].approved == msg.sender, "This request has not been approved by all owners.");
    }

    function deposit(uint accountId) external payable accountOwner(accountId) {
        accounts[accountId].balance += msg.value; //Allow the user to make the deposit
    }

    //The person who calls this is by default an owner (Hence otherOwners)
    //Limit of 3 accounts for each owner (Flaws cause others can add you to other accounts)
    function createAccount(
        address[] calldata otherOwners
    ) external validOwners(owners) {
        address[] memory owners = new address[](otherOwners.length + 1); //Create an array with all owners (Plus the one creating the tx)
        owners[otherOwners.length] = msg.sender; //Make the owner of the tx the last element of the array

        uint id = nextAccountId;

        //Loop through and make sure no-one has 3 accounts already (revert if so)
        for (uint idx; idx < owners.length; idx++) {
            if (idx < owners.length - 1) {
                // -1 to not include the owner of tx that has already been added
                owners[idx] = otherOwners[idx]; //Copy owners into the new array
            }

            if (userAccounts[owners[idx]].length > 2) {
                //Already initialized therefore valid
                revert("User cannot have more than 3 accounts.");
            }
            userAccounts[owners[idx]].push(id);
        }
        accounts[id].owners = owners;
        nextAccountId++;
        emit AccountCreated(owners, id, block.timestamp);
    }

    //Used to creat a request for funds from an account for which msg.sender is an owner of
    //Must fill in the fields in the requestWithdrawl struct and add it into the account struct
    function requestWithdawl(
        uint accountId,
        uint amount
    ) external accountOwner(accountId) sufficientBalance(accountId, amount) {
        uint id = nextWithdrawId;
        //Create Ref to WithdrawRequest struct and using 'storage' so that it will modify the account struct
        //Store in the account assoc. w/the accountId in the mapping of withdraw requests
        WithdrawRequest storage request = accounts[accountId].withdrawRequests[
            id
        ];
        request.user = msg.sender;
        nextWithdrawId++;
        request.amount = amount;
        emit WithdrawRequested(
            msg.sender,
            accountId,
            id,
            amount,
            block.timestamp
        );
    }

    function approveWithdrawl(
        uint accountId,
        uint withdrawId
    ) external accountOwner(accountId) canApprove(accountId, withdrawId){
        WithdrawRequest storage request = accounts[accountId].withdrawRequests[
            withdrawId
        ];
        request.approvals++;
        request.ownersApproved[msg.sender] = true;

        //Check if marked as approved and if so update accordingly
        if (request.approvals == accounts[accountId].owners.length - 1) {
            //If all otherOwners approved request, already given owner of req. approves of it
            request.approved = true;
        }
    }

    //Once approved then will be allowed to withdrawl funds
    function withdraw(uint accountId, uint withdrawId) external  {
        //Must check sufficient balance in account as seperate req. can be made and approved by other owners
        uint amount = accounts[accountId].withdrawRequests[withdrawId].amount;
        require(getBalance(accountId) >= amount, "Insufficient funds.");

        //For security reasons, imp. to subtract amount before using call method.
        accounts[accountId].balance -= amount;
        delete accounts[accountId].withdrawRequests[withdrawId]; //Reset all fields to default

        //Make the tx
        (bool sent, ) = payable(msg.sender).call{value: amount}("");
        require(sent, "Transaction Failed.");

        emit Withdraw(withdrawId, block.timestamp);
    }

    //Public so one can get the balance within the smart contract as well
    function getBalance(uint accountId) public view returns (uint) {
        return accounts[accountId].balance;
    }

    //Get all the owners of a specified account
    function getOwners(uint accountId) public view returns (address[] memory) {
        return accounts[accountId].owners;
    }

    //Get the number of approvals for a specified withdraw request
    function getApprovals(
        uint accountId,
        uint withdrawId
    ) public view returns (uint) {
        return accounts[accountId].withdrawRequests[withdrawId].approvals;
    }

    function getAccounts() public view returns (uint[] memory) {
        return userAccounts[msg.sender];
    }
}
