import { mine, time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { IDeployedPayload } from "../interfaces";

export function testWithdrawPayment(payload: IDeployedPayload) {

    it('withdraw payment by not owner ', async () => {
        const marketplace = payload.marketplace;


        const tx = marketplace.connect(payload.signer4).withdrawEarning(
            payload.erc20Token1.address, 100000
        );

        await expect(tx).to.revertedWith('Ownable: caller is not the owner');

    });

    it('withdraw earning to by not owner ', async () => {
        const marketplace = payload.marketplace;


        const tx = marketplace.connect(payload.signer4).withdrawEarningTo(
            payload.signer2.address, payload.erc20Token1.address, 100000
        );

        await expect(tx).to.revertedWith('Ownable: caller is not the owner');

    });

    it('withdraw earning successful', async () => {
        const marketplace = payload.marketplace;

        const userAddress = payload.deployer.address;
        const erc20Token = payload.erc20Token1;

        const oldBalance = await erc20Token.balanceOf(userAddress);
        const tokenToTransfer = 100000;
        const tx = await marketplace.withdrawEarning(
            payload.erc20Token1.address, tokenToTransfer
        );

        const newBalance = await erc20Token.balanceOf(userAddress);

        expect(newBalance).equal(oldBalance.add(tokenToTransfer))

    });

    it('withdraw earning to successful', async () => {
        const marketplace = payload.marketplace;

        const userAddress = payload.signer3.address;
        const erc20Token = payload.erc20Token1;

        const oldBalance = await erc20Token.balanceOf(userAddress);
        const tokenToTransfer = 100000;

        const tx = await marketplace.withdrawEarningTo(
            userAddress, payload.erc20Token1.address, tokenToTransfer
        );

        const newBalance = await erc20Token.balanceOf(userAddress);

        expect(newBalance).equal(oldBalance.add(tokenToTransfer))

    });

    it('balance of native token earning due to mint', async () => {
        const marketplace = payload.marketplace;

        console.log('marketplace address', marketplace.address);

        const balance = await payload.nativeToken.balanceOf(marketplace.address);

        expect(balance.toString()).equal('32760000000000000');
    })
}