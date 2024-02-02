//loadFixture: Takes another function it can call so we can use the cached state of the contract
//Results in not having to redeploy the contract for every test case
const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");

describe("BankAccount", function () {
  async function deployBankAccount() {
    // Contracts are deployed using the first signer/account by default
    // Can get the different accounts to use to sign tx's
    const [addr0, addr1, addr2, addr3, addr4] = await ethers.getSigners();

    //Automatically gets BankAccount from the contract directory defined in folder
    const BankAccount = await ethers.getContractFactory("BankAccount");

    //Once deployed, return the bankAccount instance
    const bankAccount = await BankAccount.deploy();

    //All the address that can be used to connect to instance and smart contract
    return { bankAccount, addr0, addr1, addr2, addr3, addr4 };
  }

  /*
    Allows for an easy way to create contracts to then be used for testing upon
    Used in: Depositing test case.
  */
  async function deployBankAccountWithAccounts(
    owners = 1,
    deposit = 0,
    withdrawlAmounts = []
  ) {
    const { bankAccount, addr0, addr1, addr2, addr3, addr4 } =
      await loadFixture(deployBankAccount); //Use the function to load the bank account
    //Now create an account with the specified number of owners
    let addresses = [];
    if (owners == 2) {
      addresses = [addr1.address];
    } else if (owners == 3) {
      addresses = [addr1.address, addr2.address];
    } else if (owners == 4) {
      addresses = [addr1.address, addr2.address, addr3.address];
    }
    //Now call contract to create account with owners
    //First account Id will be zero, so if a deposit value is > 0
    await bankAccount.connect(addr0).createAccount(addresses);
    //Must deposit to an account number, using the account created above (i.e. 0)
    if (deposit > 0) {
      await bankAccount
        .connect(addr0)
        .deposit(0, { value: deposit.toString() }); //Deposits in Wei amount as a string
    }

    //Loop through the array of numbers representing the amounts requesting to be withdrawn from account
    //Make a request for each of these amounts to account 0, address 0 will always be one of the owners of this account
    for (const withdrawlAmount of withdrawlAmounts) {
      await bankAccount.connect(addr0).requestWithdrawl(0, withdrawlAmount);
    }
    return { bankAccount, addr0, addr1, addr2, addr3, addr4 };
  }
  /*
  IMPORTANT NOTES: 
  - Each contract is fresh and thus the tests state is independent of one another
  - Block tests using the subheaders through describes
*/
  // - Make sure the contract can deploy successfully
  describe("Deployment", () => {
    it("Should deploy without error", async () => {
      await loadFixture(deployBankAccount); //Will call if not called before or just return the cached addresses
    });
  });
  /*
  Can fail valid owners, or owner laready has multiple accounts
  Will test all these cases in this describe block
  WIll be used to test:
   1) CAN create an account with 1, 2, 3 owners
   2) CANNOT create account with duplicate owners
   3) CANNOT create account with more than 5 owners
*/
  describe("Creating an account", () => {
    it("Should allow creating a single user account", async () => {
      const { bankAccount, addr0 } = await loadFixture(deployBankAccount);
      //Using the instance of the smart contract, I will use it to tr and create an account
      await bankAccount.connect(addr0).createAccount([]); //Will pass the object/s if necessary in params
      const accounts = await bankAccount.connect(addr0).getAccounts(); //Get the number of accounts
      expect(accounts.length).to.equal(1); //Should be equal to one after creating an owner
    });

    it("Should allow creating a double user account", async () => {
      const { bankAccount, addr0, addr1 } = await loadFixture(
        deployBankAccount
      );
      await bankAccount.connect(addr0).createAccount([addr1]);
      const accounts1 = await bankAccount.connect(addr0).getAccounts(); //Get the number of accounts for addr0
      expect(accounts1.length).to.equal(1); //Should be equal to 1 after creating an owner
      const accounts2 = await bankAccount.connect(addr1).getAccounts(); //Get the number of accounts
      expect(accounts2.length).to.equal(1); //Should be equal to 1 after creating an owner
    });
    it("Should allow creating a triple user account", async () => {
      const { bankAccount, addr0, addr1, addr2 } = await loadFixture(
        deployBankAccount
      );
      await bankAccount.connect(addr0).createAccount([addr1, addr2]);
      const accounts1 = await bankAccount.connect(addr0).getAccounts();
      expect(accounts1.length).to.equal(1);
      const accounts2 = await bankAccount.connect(addr1).getAccounts();
      expect(accounts2.length).to.equal(1);
      const accounts3 = await bankAccount.connect(addr2).getAccounts();
      expect(accounts3.length).to.equal(1);
    });
    
    it("Should allow creating a quad user account", async () => {
      const { bankAccount, addr0, addr1, addr2, addr3 } = await loadFixture(
        deployBankAccount
      );
      await bankAccount.connect(addr0).createAccount([addr1, addr2, addr3]);
      const accounts1 = await bankAccount.connect(addr0).getAccounts();
      expect(accounts1.length).to.equal(1);
      const accounts2 = await bankAccount.connect(addr1).getAccounts();
      expect(accounts2.length).to.equal(1);
      const accounts3 = await bankAccount.connect(addr2).getAccounts();
      expect(accounts3.length).to.equal(1);
      const accounts4 = await bankAccount.connect(addr3).getAccounts();
      expect(accounts4.length).to.equal(1);
    });
    /*
    TESTING FOR FAILURE
*/
    it("Should not allow creating account with duplicate owners", async () => {
      const { bankAccount, addr0 } = await loadFixture(deployBankAccount);
      expect(bankAccount.connect(addr0).createAccount([addr0])).to.be.reverted;
    });

    it("Should not allow creating account with 5 owners", async () => {
      const { bankAccount, addr0, addr1, addr2, addr3, addr4 } =
        await loadFixture(deployBankAccount);
      expect(
        bankAccount.connect(addr0).createAccount([addr1, addr2, addr3, addr4])
      ).to.be.reverted;
    });

    it("Should not allow creating account with 5 owners", async () => {
      const { bankAccount, addr0 } = await loadFixture(deployBankAccount);
      for (let idx = 0; idx < 3; idx++) {
        await bankAccount.connect(addr0).createAccount([]);
      }

      expect(bankAccount.connect(addr0).createAccount([])).to.be.reverted; //Should fail after creating 5th owner
    });
  });

/*
    TESTING FOR DEPOSITING
*/
  describe("Depositing", () => {
    it("Should allow deposit from account owner", async () => {
      const { bankAccount, addr0 } = await deployBankAccountWithAccounts(1);

      //Checking if the balance of the smart contract and the account change after deposit
      //changeEtherBalances(): Check that the etheruem balances of mutliple accounts changed by the value passed as param
      await expect(
        bankAccount.connect(addr0).deposit(0, { value: "100" })
      ).to.changeEtherBalances([bankAccount, addr0], ["100", "-100"]);
    });

    it("Should NOT allow deposit from non-account owner", async () => {
      const { bankAccount, addr1 } = await deployBankAccountWithAccounts(1);
      await expect(bankAccount.connect(addr1).deposit(0, { value: "100" })).to
        .be.reverted;
    });
  });
/*
    TESTING FOR WITHDRAW
*/
  describe("Withdraw", () => {
    describe("Request a Withdrawl", () => {
      it("Account owner can request a withdrawl", async () => {
        //Deploy a bankAccount with one owner and that has a balance of 100 (to be deposited)
        const { bankAccount, addr0 } = await deployBankAccountWithAccounts(
          1,
          100
        );
        //Must be successfull and no expects are needed since if it is reverted the test case will automatically fail
        await bankAccount.connect(addr0).requestWithdrawl(0, 100); //Try to withdraw the funds
      });

      it("Account owner can not request withdraw with invalid amount", async () => {
        const { bankAccount, addr0 } = await deployBankAccountWithAccounts(
          1,
          100
        );
        await expect(bankAccount.connect(addr0).requestWithdrawl(0, 101)).to.be
          .reverted;
      });

      it("Non-account owner cannot request withdraw", async () => {
        const { bankAccount, addr1 } = await deployBankAccountWithAccounts(
          1,
          100
        );
        await expect(bankAccount.connect(addr1).requestWithdrawl(0, 90)).to.be
          .reverted; //Owner is addr1 while request is from addr0
      });

      it("User can make multiple withdrawls", async () => {
        const { bankAccount, addr0 } = await deployBankAccountWithAccounts(
          1,
          100
        );
        await bankAccount.connect(addr0).requestWithdrawl(0, 90);
        await bankAccount.connect(addr0).requestWithdrawl(0, 100);
      });
    });

    describe("Approve a Withdraw", () => {
      it("Should allow an account owner to approve withdraw", async () => {
        const { bankAccount, addr1 } = await deployBankAccountWithAccounts(
          2, //Owners
          100, //Deposited
          [100] //Request a withdraw in the function for this amount
        );
        //Connecting to account 1 (Not the creator which is 0) but also an owner
        await bankAccount.connect(addr1).approveWithdrawl(0, 0);

        //Important Note: 
        // When awiting when somthing is reverted or not, 'await' goes on the outside of the expect
        // When awiting the value of something (such as below), 'await' goes on the inside of the expect
        expect(await bankAccount.getApprovals(0,0)).to.equal(1);
      });
      /*
        After the withdraw request above succeded then all of the below should fail
      */
      it("Should not allow an non-account owner to approve withdraw", async () => {
        const { bankAccount, addr2 } = await deployBankAccountWithAccounts(
          2,
          100, 
          [100] 
        );
        await expect(bankAccount.connect(addr2).approveWithdrawl(0,0)).to.be.reverted;
      });

      it("Should not allow owner to approve same withdraw mutiple times", async () => {
        const { bankAccount, addr1 } = await deployBankAccountWithAccounts(
          2,
          100, 
          [100] 
        );
        bankAccount.connect(addr1).approveWithdrawl(0,0);
        await expect(bankAccount.connect(addr1).approveWithdrawl(0,0)).to.be.reverted;
      });

      it("Should not allow creator of request to approve request", async () => {
        const { bankAccount, addr0 } = await deployBankAccountWithAccounts(
          2,
          100, 
          [100] 
        );
        await expect(bankAccount.connect(addr0).approveWithdrawl(0,0)).to.be.reverted;
      });
    });
  });
});
