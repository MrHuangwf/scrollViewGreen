import ScrollViewGreen from "./ScrollViewGreen";
import { TestSGItemData } from "./ScrollViewGreenTypes";

const { ccclass, property } = cc._decorator;

@ccclass
export default class TestScrollView extends cc.Component {

    @property({ type: ScrollViewGreen, tooltip: "垂直滚动视图" })
    scrollViewV: ScrollViewGreen;
    @property({ type: ScrollViewGreen, tooltip: "水平滚动视图" })
    scrollViewH: ScrollViewGreen;
    @property({ type: ScrollViewGreen, tooltip: "网格滚动视图" })
    scrollViewG: ScrollViewGreen;

    @property({ type: cc.EditBox, tooltip: "操作数量输入框" })
    countOptEditBox: cc.EditBox;
    @property({ type: cc.EditBox, tooltip: "操作下标输入框" })
    indexOptEditBox: cc.EditBox;

    @property({ type: cc.Label, tooltip: "提示文本" })
    tipLabel: cc.Label;

    private _data: TestSGItemData[] = [];

    protected start(): void {

    }

    registerDataToView() {
        this.scrollViewV.registerData(this._data);
        this.scrollViewH.registerData([...this._data]);
        this.scrollViewG.registerData([...this._data]);
        this.updateTipLabel();
    }

    /**获取操作数量 */
    getOptCount(): number {
        let str = this.countOptEditBox.string;
        if ("" === str.trim()) {
            return 0;
        }
        let count = parseInt(this.countOptEditBox.string);
        return count > 0 ? count : 0;
    }

    /**获取操作下标 */
    getOptIndex(): number {
        let str = this.indexOptEditBox.string;
        if ("" === str.trim()) {
            return -1;
        }
        let index = parseInt(this.indexOptEditBox.string);
        return index >= 0 ? index : 0;
    }

    onAddClick() {
        let count = this.getOptCount();
        if (0 === count) {
            return;
        }
        let preLen = this._data.length;
        let index = this.getOptIndex();
        index = -1 === index ? this._data.length : index;
        index = Math.min(index, this._data.length);
        let data: TestSGItemData[] = [];
        for (let i = 1; i <= count; i++) {
            data.push({ _k: `${index + i}`, content: `content${index + i}` });
        }
        this._data.splice(index, 0, ...data);
        for (let i = 0; i < this._data.length; i++) {
            this._data[i] = { _k: `${i + 1}`, content: `content${i + 1}` };
        }
        this.registerDataToView();
    }

    onRemoveClick() {
        let count = this.getOptCount();
        if (0 === count) {
            return;
        }
        let index = this.getOptIndex();
        if (index < 0 || index >= this._data.length) {
            return;
        }
        this._data.splice(index, count);
        this.registerDataToView();
    }

    updateTipLabel() {
        this.tipLabel.string = `当前数据总数量：${this._data.length}`;
    }
}
