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
    event WithdrawRequesed(
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
    mapping(address => uint[]) userAccounts;  //Stores the ID's of the user accounts (Need to know the which accounts the user is a owner of)

    //Incremented upon each account so that each new account has a unique ID
    uint nextAccountId;
    uint nextWithdrawId; 

    //Must loop through the owners of the account to see if current Id is an owner of account
    modifier accountOwner(uint accountId) {
        bool isOwner; 
        for (uint idx; idx < accounts[accountId].owners.length; idx++) {
            if (accounts[accountId].owners[idx] == msg.sender) { //Check if the person sending the tx is an owner
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

    function deposit(uint accountId) external payable {
        accounts[accountId].balance += msg.value; //Allow the user to make the deposit 
    }

    //The person who calls this is by default an owner (Hence otherOwners)
    //Limit of 3 accounts for each owner (Flaws cause others can add you to other accounts)
    function createAccount(address[] calldata otherOwners) external {
        address[] memory owners = new address[](otherOwners.length + 1); //Create an array with all owners (Plus the one creating the tx)
        owners[otherOwners.length] = msg.sender; //Make the owner of the tx the last element of the array
        
        uint id = nextAccountId; 

        //Loop through and make sure no-one has 3 accounts already (revert if so)
        for (uint idx; idx < owners.length; idx++) {
            if (idx < owners.length - 1) { // -1 to not include the owner of tx that has already been added
                owners[idx] = otherOwners[idx]; //Copy owners into the new array
            }

            if (userAccounts[owners[idx]].length > 2)  {//Already initialized therefore valid
                revert("User cannot have more than 3 accounts.");
            }
            userAccounts[owners[idx]].push(id);
        }
        accounts[id].owners = owners;
        nextAccountId++;
        emit AccountCreated(owners, id, block.timestamp);

        
    }

    function requestWithdawl(uint accountId, uint amount) external {}

    function approveWithdrawl(uint accountId, uint withdrawId) external {}

    //Once approved then will be allowed to withdrawl funds
    function withdraw(uint accountId, uint withdrawId) external {}

    //Public so one can get the balance within the smart contract as well
    function getBalance(uint accountId) public view returns (uint) {}

    //Get all the owners of a specified account
    function getOwners(uint accountId) public view returns (address[] memory) {}

    //Get the number of approvals for a specified withdraw request
    function getApprovals(uint accountId, uint withdrawId) public view returns (uint) {}

    function getAccounts() public view returns (uint[] memory) {}
}
