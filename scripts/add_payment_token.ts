import { expect } from "chai";
import { ethers } from "hardhat";
const { LedgerSigner } = require("@anders-t/ethers-ledger");

// import { LedgerSigner } from "@ethersproject/hardware-wallets";

async function main() {
    const ledger = new LedgerSigner(ethers.provider);

    const marketplaceAddress = process.env.MARKETPLACE_ADDRESS;

    const contract = await ethers.getContractFactory('OSNFTMarketPlace');

    const contractFactory = contract.connect(ledger);

    const contractInstance = await contractFactory.attach(marketplaceAddress as string);
// const tokenAddresses = ['0x2791bca1f2de4661ed88a30c99a7a9449aa84174', '0xc2132d05d31c914a87c6611c10748aeb04b58e8f', '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063', '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619']
    // const tokenAddresses = ['0xdab529f40e671a1d4bf91361c21bf9f0c9712ab7', '0xd6df932a45c0f255f85145f286ea0b292b21c90b', '0x53e0bca35ec356bd5dddfebbd1fc0fd03fabad39', '0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6'];
    const tokenAddresses =['0xb33eaad8d922b1083446dc23f610c2567fb5180f', '0x0b3f868e0be5597d5db7feb59e1cadbb0fdda50a', '0x385eeac5cb85a38a9a07a70c73e0a3271cfb54a7', '0x9a71012b13ca4d3d0cdc72a177df3ef03b0e76a3'];
    // const tokenAddresses = ['0xa1c57f48f0deb89f569dfbe6e2b7f46d33606fd4', '0xbbba073c31bf03b8acf7c28ef0738decf3695683', '0x2e1ad108ff1d8c782fcbbb89aad783ac49586756', '0xe1b183ff79ad9b41ae05f4ae6026d8d8b8a04b50']
    
    let results = await Promise.all(
        tokenAddresses.map(tokenAddress => {
            return contractInstance.isPayableToken(tokenAddress);
        })
    );

    results.forEach((isPayableToken, index) => {
        console.log("payable", isPayableToken, index);
        expect(isPayableToken).equal(false);
    });

    const tx = await contractInstance.addPayableTokens(tokenAddresses, {
        maxPriorityFeePerGas: 30000000000
    });
    await tx.wait();
    // wait for 10 sec to reflect the data
    await new Promise((res) => {
        setTimeout(res, 10000);
    })

    results = await Promise.all(
        tokenAddresses.map(tokenAddress => {
            return contractInstance.isPayableToken(tokenAddress);
        })
    );

    results.forEach((isPayableToken, index) => {
        console.log("payable", isPayableToken, index);
        expect(isPayableToken).equal(true);
    });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
