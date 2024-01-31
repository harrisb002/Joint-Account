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
    const [address0, address1, address3, address4] = await ethers.getSigners(); 

    //Automatically gets BankAccount from the contract directory defined in folder
    const BankAccount = await ethers.getContractFactory("BankAccount");

    //Once deployed, return the bankAccount instance
    const bankAccount = await BankAccount.deploy();

    //All the address that can be used to connect to instance and smart contract
    return { bankAccount, address0, address1, address3, address4};
  }

  //Block tests using the subheaders through describes

  //Make sure the contract can deploy successfully
  describe("Deployment", () => {
    it("Should deploy without error", async () => {
      await loadFixture(deployBankAccount) //Will call if not called before or
    })
  })
});
