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
}
