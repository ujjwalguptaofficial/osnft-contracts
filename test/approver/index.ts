import { expect } from "chai";
import { ethers } from "hardhat";
import { IDeployedPayload } from "../interfaces";

export function testApprover(payload: IDeployedPayload) {

    it('isApprover', async () => {
        const tx = await payload.approver.isApprover(payload.deployer.address);
        await expect(tx).equal(false);
    })

    it('add approver', async () => {
        const tx = payload.approver.addApprover(payload.deployer.address);
        await expect(tx).emit(payload.approver, 'ApproverAdded').withArgs(
            payload.deployer.address
        );
    });

    it('add approver other than owner', async () => {
        const tx = payload.approver.connect(payload.signer2).addApprover(payload.deployer.address);

        await expect(tx).revertedWith('Ownable: caller is not the owner')
    });

    it('remove minter', async () => {
        let tx = payload.approver.addApprover(payload.signer2.address);

        await expect(tx).emit(payload.approver, 'ApproverAdded').withArgs(
            payload.signer2.address
        );

        tx = payload.approver.removeApprover(payload.signer2.address);

        await expect(tx).emit(payload.approver, 'ApproverRemoved').withArgs(
            payload.signer2.address
        );

    });

    it('remove minter other than owner', async () => {
        const tx = payload.approver.connect(payload.signer2).removeApprover(payload.deployer.address);

        await expect(tx).revertedWith('Ownable: caller is not the owner');
    });

    it('add project jsstore-example', async () => {
        const tokenId = payload.getProjectId(
            payload.projects["jsstore-example"]
        );
        const address = payload.deployer.address;

        let approvedValue = await payload.approver.getProjectApproved(
            tokenId
        );

        expect(approvedValue).equal(ethers.constants.AddressZero);

        const tx = payload.approver.approveProject(
            tokenId, address
        );
        await expect(tx).emit(payload.approver, "ProjectApproved").withArgs(
            tokenId, address
        )

        approvedValue = await payload.approver.getProjectApproved(
            tokenId
        );

        expect(approvedValue).equal(address);
    })

    it('add project mahal-example', async () => {
        const tokenId = payload.getProjectId(
            payload.projects["mahal-example"]
        );
        const address = payload.signer2.address;

        let approvedValue = await payload.approver.getProjectApproved(
            tokenId
        );

        expect(approvedValue).equal(ethers.constants.AddressZero);

        const tx = payload.approver.approveProject(
            tokenId, address
        );
        await expect(tx).emit(payload.approver, "ProjectApproved").withArgs(
            tokenId, address
        )

        approvedValue = await payload.approver.getProjectApproved(
            tokenId
        );

        expect(approvedValue).equal(address);
    })

    it('add project mahal', async () => {
        const tokenId = payload.getProjectId(
            payload.projects["mahal"]
        );
        const address = payload.signer2.address;

        let approvedValue = await payload.approver.getProjectApproved(
            tokenId
        );

        expect(approvedValue).equal(ethers.constants.AddressZero);

        const tx = payload.approver.approveProject(
            tokenId, address
        );
        await expect(tx).emit(payload.approver, "ProjectApproved").withArgs(
            tokenId, address
        )

        approvedValue = await payload.approver.getProjectApproved(
            tokenId
        );

        expect(approvedValue).equal(address);
    })

    it('add project jsstore', async () => {
        const tokenId = payload.getProjectId(
            payload.projects["jsstore"]
        );
        const address = payload.deployer.address;

        let approvedValue = await payload.approver.getProjectApproved(
            tokenId
        );

        expect(approvedValue).equal(ethers.constants.AddressZero);

        const tx = payload.approver.approveProject(
            tokenId, address
        );
        await expect(tx).emit(payload.approver, "ProjectApproved").withArgs(
            tokenId, address
        )

        approvedValue = await payload.approver.getProjectApproved(
            tokenId
        );

        expect(approvedValue).equal(address);
    })

}
