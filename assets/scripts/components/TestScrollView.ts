import ScrollViewGreen from "./ScrollViewGreen";
import { TestSGItemData, SGItemData } from "./ScrollViewGreenTypes";

const { ccclass, property } = cc._decorator;

@ccclass
export default class TestScrollView extends cc.Component {

    @property({ type: ScrollViewGreen, tooltip: "垂直滚动视图" })
    scrollViewV: ScrollViewGreen;
    @property({ type: ScrollViewGreen, tooltip: "水平滚动视图" })
    scrollViewH: ScrollViewGreen;
    @property({ type: ScrollViewGreen, tooltip: "网格滚动视图" })
    scrollViewG: ScrollViewGreen;

    protected start(): void {
        let data: TestSGItemData[] = [];
        const ITEM_COUNT = 30;
        for (let i = 1; i <= ITEM_COUNT; i++) {
            data.push({ _k: i.toString(), content: "content" + i });
        }
        this.scrollViewV.registerData(data);
        this.scrollViewH.registerData([...data]);
        this.scrollViewG.registerData([...data]);
    }
}
