import { TestSGItemData, ISGItemBaseCompnent, SGItemData } from "./ScrollViewGreenTypes";

const { ccclass, property } = cc._decorator;

@ccclass
export default class TestSGItemCompnent extends ISGItemBaseCompnent<TestSGItemData> {

    @property({ type: cc.Label, tooltip: "内容" })
    contentLabel: cc.Label;

    setData(p: SGItemData<TestSGItemData>) {
        super.setData(p);
        this.contentLabel.string = p.content;
    }
}
