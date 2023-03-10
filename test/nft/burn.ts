import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { IDeployedPayload } from "../interfaces";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { signMessageForMint } from "./mint";


export function testBurn(payload: IDeployedPayload) {

    it('not owner', async () => {
        const nft = payload.nft;
        const projectUrl = payload.projects.jsstore;
        const tokenId = payload.getProjectId(projectUrl);
        const tx = nft.connect(payload.operator).burn(tokenId);

        await expect(tx).revertedWithCustomError(nft, 'RequireTokenOwner');
    })

    it('success by first investor', async () => {
        const nft = payload.nft.connect(payload.signer2);
        const owner = payload.signer2.address;
        const projectUrl = payload.projects.jsstore;
        const tokenId = payload.getProjectId(projectUrl);
        const projectInfoBefore = await nft.getProject(tokenId);
        const contreactEarningBefore = await nft.getContractEarning(payload.erc20Token1.address);

        const investedAmount = await nft.getInvestedAmount(tokenId, owner);
        const paymentTokenBalanceBefore = await payload.erc20Token1.balanceOf(owner);
        const returnAmount = projectInfoBefore.treasuryTotalAmount.div(projectInfoBefore.tokenCount);
        let profit = returnAmount.sub(investedAmount);
        // profit = profit.gt(0) ? profit : ethers.BigNumber.from(0);

        console.log("profit", profit.toString(), returnAmount.toString(), projectInfoBefore.treasuryTotalAmount.toString(), investedAmount.toString());

        const tx = nft.burn(tokenId);

        await expect(tx).to.emit(nft, 'TransferSingle').withArgs(
            owner, owner, ethers.constants.AddressZero, tokenId, 1
        );

        // balance should be zero
        const nftBalanceAfter = await nft.balanceOf(owner, tokenId);
        expect(nftBalanceAfter).equal(0);

        // check payment transfer to owner
        const contractEarning = payload.getPercentage(profit, 2);
        const paymentTokenBalanceAfter = await payload.erc20Token1.balanceOf(owner);
        expect(paymentTokenBalanceAfter).equal(
            paymentTokenBalanceBefore.add(returnAmount.sub(contractEarning))
        );

        // check treasure amount after
        const projectInfoAfter = await nft.getProject(tokenId);
        expect(projectInfoAfter.tokenCount).equal(projectInfoBefore.tokenCount.sub(1));
        expect(projectInfoAfter.treasuryTotalAmount).equal(projectInfoBefore.treasuryTotalAmount.sub(returnAmount));

        // check contract earning
        console.log("contractEarning", contractEarning);
        const contreactEarningAfter = await nft.getContractEarning(payload.erc20Token1.address);
        expect(contreactEarningAfter).equal(contreactEarningBefore.add(contractEarning));
    })

    it('exit again by first investor', async () => {
        const nft = payload.nft.connect(payload.signer2);
        const owner = payload.signer2.address;
        const projectUrl = payload.projects.jsstore;
        const tokenId = payload.getProjectId(projectUrl);
        const investedAmount = nft.getInvestedAmount(tokenId, owner);
        await expect(investedAmount).revertedWithCustomError(nft, 'RequireTokenOwner');

        const tx = nft.burn(tokenId);

        await expect(tx).revertedWithCustomError(nft, 'RequireTokenOwner');
    })

    it('success by last investor', async () => {
        const nft = payload.nft.connect(payload.signer4);
        const owner = payload.signer4.address;
        const projectUrl = payload.projects.jsstore;
        const tokenId = payload.getProjectId(projectUrl);
        const projectInfoBefore = await nft.getProject(tokenId);
        const contreactEarningBefore = await nft.getContractEarning(payload.erc20Token1.address);
        const investedAmount = await nft.getInvestedAmount(tokenId, owner);
        const paymentTokenBalanceBefore = await payload.erc20Token1.balanceOf(owner);
        const returnAmount = projectInfoBefore.treasuryTotalAmount.div(projectInfoBefore.tokenCount);
        let profit = returnAmount.sub(investedAmount);
        profit = profit.gt(0) ? profit : ethers.BigNumber.from(0);

        console.log("profit", profit.toString(), returnAmount.toString(), projectInfoBefore.treasuryTotalAmount.toString());

        const tx = nft.burn(tokenId);

        await expect(tx).to.emit(nft, 'TransferSingle').withArgs(
            owner, owner, ethers.constants.AddressZero, tokenId, 1
        );

        // balance should be zero
        const nftBalanceAfter = await nft.balanceOf(owner, tokenId);
        expect(nftBalanceAfter).equal(0);

        // check payment transfer to owner
        const contractEarning = payload.getPercentage(profit, 2);
        const paymentTokenBalanceAfter = await payload.erc20Token1.balanceOf(owner);
        expect(paymentTokenBalanceAfter).equal(
            paymentTokenBalanceBefore.add(returnAmount.sub(contractEarning))
        );

        // check treasure amount after
        const projectInfoAfter = await nft.getProject(tokenId);
        expect(projectInfoAfter.tokenCount).equal(projectInfoBefore.tokenCount.sub(1));
        expect(projectInfoAfter.treasuryTotalAmount).equal(projectInfoBefore.treasuryTotalAmount.sub(returnAmount));

        // check contract earning
        console.log("contractEarning", contractEarning);
        const contreactEarningAfter = await nft.getContractEarning(payload.erc20Token1.address);
        expect(contreactEarningAfter).equal(contreactEarningBefore.add(contractEarning));
    })

    it('burn by creator', async () => {
        const nft = payload.nft.connect(payload.deployer);
        const owner = payload.deployer.address;
        const projectUrl = payload.projects.jsstore;
        const tokenId = payload.getProjectId(projectUrl);
        const projectInfoBefore = await nft.getProject(tokenId);
        const contreactEarningBefore = await nft.getContractEarning(payload.erc20Token1.address);

        const investedAmount = await nft.getInvestedAmount(tokenId, owner);
        const paymentTokenBalanceBefore = await payload.erc20Token1.balanceOf(owner);
        const returnAmount = projectInfoBefore.treasuryTotalAmount.div(projectInfoBefore.tokenCount);
        let profit = returnAmount.sub(investedAmount);
        // profit = profit.gt(0) ? profit : ethers.BigNumber.from(0);

        console.log("profit", profit.toString(), returnAmount.toString(), projectInfoBefore.treasuryTotalAmount.toString(), investedAmount.toString());

        const tx = nft.burn(tokenId);

        await expect(tx).to.emit(nft, 'TransferSingle').withArgs(
            owner, owner, ethers.constants.AddressZero, tokenId, 1
        );

        // balance should be zero
        const nftBalanceAfter = await nft.balanceOf(owner, tokenId);
        expect(nftBalanceAfter).equal(0);

        // check payment transfer to owner
        const contractEarning = payload.getPercentage(profit, 2);
        const paymentTokenBalanceAfter = await payload.erc20Token1.balanceOf(owner);
        expect(paymentTokenBalanceAfter).equal(
            paymentTokenBalanceBefore.add(returnAmount.sub(contractEarning))
        );

        // check treasure amount after
        const projectInfoAfter = await nft.getProject(tokenId);
        expect(projectInfoAfter.tokenCount).equal(projectInfoBefore.tokenCount.sub(1));
        expect(projectInfoAfter.treasuryTotalAmount).equal(projectInfoBefore.treasuryTotalAmount.sub(returnAmount));

        // check contract earning
        console.log("contractEarning", contractEarning);
        const contreactEarningAfter = await nft.getContractEarning(payload.erc20Token1.address);
        expect(contreactEarningAfter).equal(contreactEarningBefore.add(contractEarning));
    })

    it('mint after burn by creator', async () => {
        const nft = payload.nft;
        const timestamp = await time.latest() + 1000;

        const projectUrl = payload.projects.jsstore;
        const tokenId = payload.getProjectId(projectUrl);
        const star = 100;
        const fork = 25;
        const to = payload.deployer.address;
        const signature = signMessageForMint.call(payload, payload.operator, tokenId.toString(), star, fork, timestamp);

        const projectInfoBefore = await nft.getProject(tokenId);
        const balanceOfCreatorBefore = await payload.erc20Token1.balanceOf(projectInfoBefore.creator);

        // allow payment token
        await payload.erc20Token1.connect(payload.deployer).approve(nft.address, ethers.constants.MaxUint256);

        const allowance = await payload.erc20Token1.allowance(to, nft.address);

        const balanceOfMinterBefore = await payload.erc20Token1.balanceOf(to);

        const contractEarningBefore = await nft.getContractEarning(projectInfoBefore.paymentERC20Token);


        const tx = nft.connect(payload.deployer).mintTo(tokenId, star, fork, {
            signature, to: payload.operator.address, validUntil: timestamp
        });

        // check for transfer events

        await expect(tx).to.emit(nft, 'TransferSingle').withArgs(
            to, ethers.constants.AddressZero, to, tokenId, 1
        );

        const projectInfoAfter = await nft.getProject(tokenId);

        expect(projectInfoAfter.tokenCount).equal(2);

        let expectedMintPrice = payload.mintPrice(star, fork, projectInfoAfter);
        expectedMintPrice = expectedMintPrice > projectInfoBefore.lastMintPrice ? expectedMintPrice : projectInfoBefore.lastMintPrice;


        const expectedMintPriceBN = ethers.BigNumber.from(expectedMintPrice);

        const contractRoyality = payload.getPercentage(
            expectedMintPriceBN, 1
        );

        const creatorRoyality = await projectInfoAfter.royality;

        const creatorRoyalityValue = payload.getPercentage(
            ethers.BigNumber.from(expectedMintPrice), creatorRoyality
        );

        const amountForTreasury = expectedMintPriceBN.sub(contractRoyality).sub(creatorRoyalityValue);

        expect(projectInfoAfter.treasuryTotalAmount).equal(amountForTreasury.add(projectInfoBefore.treasuryTotalAmount));
        expect(projectInfoAfter.lastMintPrice).equal(expectedMintPrice);

        // nft balance of creator

        const balanceOfCreator = await nft.balanceOf(to, tokenId);
        expect(balanceOfCreator).equal(1);

        // check tokenmint 

        expect(tx).to.emit(nft, "TokenMint").withArgs(star, fork, expectedMintPrice);

        // check contract earnings
        const contractEarning = await nft.getContractEarning(projectInfoAfter.paymentERC20Token);
        expect(contractEarning).equal(contractRoyality.add(contractEarningBefore));

        //check creator earnings
        const balanceOfCreatorAfter = await payload.erc20Token1.balanceOf(projectInfoBefore.creator);
        expect(balanceOfCreatorAfter).equal(
            // creatorRoyalityValue.add(balanceOfCreatorBefore)
            balanceOfCreatorBefore.sub(expectedMintPriceBN).add(creatorRoyalityValue)
        );
    })

}