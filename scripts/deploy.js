// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.

//Deployment notes:
// - Must run a local hardhat node that acts as the blockchain netword to interact with: 
//     'npx hardhat node'
// - Then with the node instance, keep running and in seperate terminal:
//     `npx hardhat run --network localhost ./scripts/deploy.js`

const hre = require("hardhat");
const fs = require("fs/promises");

async function main() {
  const BankAccount = await hre.ethers.deployContract("BankAccount");
  const bankAccount = await BankAccount.waitForDeployment();

  console.log(bankAccount);
  await writeDeploymentInfo(bankAccount);
}

async function writeDeploymentInfo(contract) {
  const data = {
    contract: {
      address: contract.target,  // represents the contract address named 'target'
      signerAddress: contract.runner.address,  // Use 'runner.address' instead of 'signer.address' 
      abi: contract.interface.format(),
    },
  };

  const content = JSON.stringify(data, null, 2);
  await fs.writeFile("deployment.json", content, { encoding: "utf-8" });
}


// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});