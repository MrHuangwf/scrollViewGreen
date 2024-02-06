import { ISGItemBaseCompnent } from "./ScrollViewGreenTypes";

const { ccclass, property } = cc._decorator;

@ccclass
export default class ScrollViewGreen extends cc.ScrollView {

    @property({ type: cc.Prefab, tooltip: "子节点预制体" })
    itemPrefab: cc.Prefab;

    @property({ type: Boolean, tooltip: "是否开启分帧加载" })
    scheduleLoad: boolean = false;
    @property({ type: Number, tooltip: "单帧加载数量,1-10,可根据实际需要调整", range: [1, 10, 1] })
    frameLoadCount: number = 5;

    @property({ type: Number, tooltip: "网格布局时，如果选择子节点的优先排布方向为水平，请设置最大列数" })
    maxCol: number = 1;
    @property({ type: Number, tooltip: "网格布局时，如果选择子节点的优先排布方向为垂直，请设置最大行数" })
    maxRow: number = 1;

    /**布局信息, 自动从content节点上获取layout信息 */
    private _layoutInfo = {
        /**布局类型 */
        _layoutType: cc.Layout.Type.NONE,
        /**左右间距 */
        _spaceX: 0,
        /**上下间距 */
        _spaceY: 0,
        /**上边距 */
        _paddingTop: 0,
        /**下边距 */
        _paddingBottom: 0,
        /**左边距 */
        _paddingLeft: 0,
        /**右边距 */
        _paddingRight: 0
    };
    /**子节点信息 */
    private _itemInfo = {
        /**宽度 */
        width: 0,
        /**高度 */
        height: 0,
        /**锚点, 自动从item中获取*/
        anchor: cc.v2(0.5, 0.5),
    };
    /**当前的所有数据列表 */
    private _allData: any[] = [];
    /**分帧加载队列 */
    private _loadQueue: any[] = [];
    /**已经渲染的item数量 */
    private _loadedCount: number = 0;
    /**item的key对应contentNode中的pos */
    private _itemPosMap: { [key: string]: cc.Vec2 } = {};

    protected onLoad() {
        this.node.on("scrolling", this.onScrolling, this);
        this._loadQueue = [];
        let scrollWidget: cc.Widget = this.node.getComponent(cc.Widget);
        if (scrollWidget) {
            scrollWidget.updateAlignment();
        }
        let preGenNode: cc.Node = cc.instantiate(this.itemPrefab);
        this._itemInfo.anchor = cc.v2(preGenNode.anchorX, preGenNode.anchorY);
        this._itemInfo.width = preGenNode.width;
        this._itemInfo.height = preGenNode.height;
        this._initLayoutInfo();
    }

    /**初始化布局信息 */
    private _initLayoutInfo() {
        let layout: cc.Layout = this.content.getComponent(cc.Layout);
        if (layout) {
            let layoutType: cc.Layout.Type = layout.type;
            this._layoutInfo._layoutType = layoutType;
            switch (layoutType) {
                //网格布局
                case cc.Layout.Type.GRID:
                    {
                        this._layoutInfo._spaceX = layout.spacingX;
                        this._layoutInfo._spaceY = layout.spacingY;
                        this._layoutInfo._paddingTop = layout.paddingTop;
                        this._layoutInfo._paddingBottom = layout.paddingBottom;
                        this._layoutInfo._paddingLeft = layout.paddingLeft;
                        this._layoutInfo._paddingRight = layout.paddingRight;
                    }
                    break;
                //垂直布局
                case cc.Layout.Type.VERTICAL:
                    {
                        this._layoutInfo._spaceY = layout.spacingY;
                        this._layoutInfo._paddingTop = layout.paddingTop;
                        this._layoutInfo._paddingBottom = layout.paddingBottom;
                    }
                    break;
                //水平布局
                case cc.Layout.Type.HORIZONTAL:
                    {
                        this._layoutInfo._spaceX = layout.spacingX;
                        this._layoutInfo._paddingLeft = layout.paddingLeft;
                        this._layoutInfo._paddingRight = layout.paddingRight;
                    }
                    break;
            }
            layout.enabled = false;
        }
    }

    /**响应滚动事件 */
    private onScrolling = () => {
        this._updateContent();
    }

    /**注入数据 */
    public registerData<T>(data: T[]) {
        this._allData = data;
        this._updateContent();
    }

    /**更新内容 */
    private _updateContent() {
        if (this.scheduleLoad && this._loadQueue.length > 0) {
            return;
        }
        this._caculateContentSize();
        this._caculateItemPos();
        this._updateItems();
    }

    /**计算content的尺寸*/
    private _caculateContentSize() {
        let layoutType: cc.Layout.Type = this._layoutInfo._layoutType;
        switch (layoutType) {
            //网格布局
            case cc.Layout.Type.GRID:
                {
                    this._caculateContentSizeGrid();
                }
                break;
            //垂直布局
            case cc.Layout.Type.VERTICAL:
                {
                    this._caculateContentSizeVertical();
                }
                break;
            //水平布局
            case cc.Layout.Type.HORIZONTAL:
                {
                    this._caculateContentSizeHorizontal();
                }
                break;
            default:
                {
                    this.content.width = this.node.width;
                    this.content.height = this.node.height;
                }
                break;
        }
    }

    /**计算网格布局的content大小 */
    private _caculateContentSizeGrid() {
        //初始方向
        let direction: cc.Layout.AxisDirection = this.content.getComponent(cc.Layout).startAxis;
        if (direction === cc.Layout.AxisDirection.HORIZONTAL) {
            this._caculateContentSizeGridHorizontal();
        } else {
            this._caculateContentSizeGridVertical();
        }
    }

    /**计算网格布局的content大小-水平方向优先 */
    private _caculateContentSizeGridHorizontal() {
        let dataLen: number = this._allData.length;
        let col: number = this.maxCol > 0 ? this.maxCol : 1;
        let width: number = this._layoutInfo._paddingLeft + this._layoutInfo._paddingRight + col * this._itemInfo.width + (col - 1) * this._layoutInfo._spaceX;
        let row: number = Math.ceil(dataLen / col);
        let height: number = this._layoutInfo._paddingTop + this._layoutInfo._paddingBottom + row * this._itemInfo.height + (row - 1) * this._layoutInfo._spaceY;
        this.content.width = Math.max(this.node.width, width);
        this.content.height = Math.max(this.node.height, height);
    }

    /**计算网格布局的content大小-垂直方向优先 */
    private _caculateContentSizeGridVertical() {
        let dataLen: number = this._allData.length;
        let row: number = this.maxRow > 0 ? this.maxRow : 1;
        let height: number = this._layoutInfo._paddingTop + this._layoutInfo._paddingBottom + row * this._itemInfo.height + (row - 1) * this._layoutInfo._spaceY;
        let col: number = Math.ceil(dataLen / row);
        let width: number = this._layoutInfo._paddingLeft + this._layoutInfo._paddingRight + col * this._itemInfo.width + (col - 1) * this._layoutInfo._spaceX;
        this.content.width = Math.max(this.node.width, width);
        this.content.height = Math.max(this.node.height, height);
    }

    /**计算垂直布局的content大小 */
    private _caculateContentSizeVertical() {
        this.content.width = Math.max(this.node.width, this._itemInfo.width);
        let dataLen: number = this._allData.length;
        let height: number = this._layoutInfo._paddingTop + this._layoutInfo._paddingBottom + dataLen * this._itemInfo.height + (dataLen - 1) * this._layoutInfo._spaceY;
        this.content.height = Math.max(this.node.height, height);
    }

    /**计算水平布局的content大小 */
    private _caculateContentSizeHorizontal() {
        this.content.height = Math.max(this.node.height, this._itemInfo.height);
        let dataLen: number = this._allData.length;
        let width: number = this._layoutInfo._paddingLeft + this._layoutInfo._paddingRight + dataLen * this._itemInfo.width + (dataLen - 1) * this._layoutInfo._spaceX;
        this.content.width = Math.max(this.node.width, width);
    }

    /**计算item的位置 */
    private _caculateItemPos() {
        let layoutType: cc.Layout.Type = this._layoutInfo._layoutType;
        switch (layoutType) {
            //网格布局
            case cc.Layout.Type.GRID:
                {
                    this._caculateItemPosGrid();
                }
                break;
            //垂直布局
            case cc.Layout.Type.VERTICAL:
                {
                    this._caculateItemPosVertical();
                }
                break;
            //水平布局
            case cc.Layout.Type.HORIZONTAL:
                {
                    this._caculateItemPosHorizontal();
                }
                break;
        }
    }

    /**计算网格布局的item位置 */
    private _caculateItemPosGrid() {
        //初始方向
        let direction: cc.Layout.AxisDirection = this.content.getComponent(cc.Layout).startAxis;
        if (direction === cc.Layout.AxisDirection.HORIZONTAL) {
            this._caculateItemPosGridHorizontal();
        } else {
            this._caculateItemPosGridVertical();
        }
    }

    /**计算网格布局的item位置-水平方向优先 */
    private _caculateItemPosGridHorizontal() {
        let dataLen: number = this._allData.length;
        for (let i = 0; i < dataLen; i++) {
            let itemKey: string = this._allData[i]._k;
            let x = this._layoutInfo._paddingLeft + (i % this.maxCol + 1) * (this._itemInfo.width) + ((i % this.maxCol) - 1) * this._layoutInfo._spaceX - this._itemInfo.width * (1 - this._itemInfo.anchor.x) - this.content.width * this.content.anchorX;
            let y = -this._layoutInfo._paddingTop - Math.floor(i / this.maxCol) * (this._itemInfo.height + this._layoutInfo._spaceY) - this._itemInfo.height * this._itemInfo.anchor.y + this.content.height * (1 - this.content.anchorY);
            this._itemPosMap[itemKey] = cc.v2(x, y);
        }
    }

    /**计算网格布局的item位置-垂直方向优先 */
    private _caculateItemPosGridVertical() {
        let dataLen: number = this._allData.length;
        for (let i = 0; i < dataLen; i++) {
            let itemKey: string = this._allData[i]._k;
            let x = this._layoutInfo._paddingLeft + Math.floor(i / this.maxRow) * (this._itemInfo.width + this._layoutInfo._spaceX) + this._itemInfo.width * this._itemInfo.anchor.x - this.content.width * this.content.anchorX;
            let y = -this._layoutInfo._paddingTop - (i % this.maxRow + 1) * this._itemInfo.height - (i % this.maxRow) * this._layoutInfo._spaceY + this._itemInfo.height * (1 - this._itemInfo.anchor.y) + this.content.height * (1 - this.content.anchorY);
            this._itemPosMap[itemKey] = cc.v2(x, y);
        }
    }

    /**计算垂直布局的item位置 */
    private _caculateItemPosVertical() {
        let dataLen: number = this._allData.length;
        for (let i = 0; i < dataLen; i++) {
            let itemKey: string = this._allData[i]._k;
            //居中对齐
            let x = this._itemInfo.width * (this._itemInfo.anchor.x - 0.5) + this.content.width * (0.5 - this.content.anchorX);
            let y = -this._layoutInfo._paddingTop - (i + 1) * this._itemInfo.height - i * this._layoutInfo._spaceY + this._itemInfo.height * this._itemInfo.anchor.y + this.content.height * (1 - this.content.anchorY);
            this._itemPosMap[itemKey] = cc.v2(x, y);
        }
    }

    /**计算水平布局的item位置 */
    private _caculateItemPosHorizontal() {
        let dataLen: number = this._allData.length;
        for (let i = 0; i < dataLen; i++) {
            let itemKey: string = this._allData[i]._k;
            let x = i * this._layoutInfo._spaceX + this._itemInfo.width * (i + 1) - this._itemInfo.width * (1 - this._itemInfo.anchor.x) - this.content.width * this.content.anchorX;
            //居中对齐
            let y = -this._itemInfo.height * (0.5 - this._itemInfo.anchor.y) + this.content.height * (0.5 - this.content.anchorY);
            this._itemPosMap[itemKey] = cc.v2(x, y);
        }
    }

    /**更新items */
    private _updateItems() {
        let layoutType: cc.Layout.Type = this._layoutInfo._layoutType;
        switch (layoutType) {
            //网格布局
            case cc.Layout.Type.GRID:
                {
                    this._updateItemsGrid();
                }
                break;
            //垂直布局
            case cc.Layout.Type.VERTICAL:
                {
                    this._updateItemsVertical();
                }
                break;
            //水平布局
            case cc.Layout.Type.HORIZONTAL:
                {
                    this._updateItemsHorizontal();
                }
                break;
        }
    }

    /**更新网格布局的item */
    private _updateItemsGrid() {
        let excute: boolean = this._isUpdateGrid();
        if (!excute) {
            return;
        }
        let direction: cc.Layout.AxisDirection = this.content.getComponent(cc.Layout).startAxis;
        if (direction === cc.Layout.AxisDirection.HORIZONTAL) {
            this._updateItemsGridHorizontal();
        } else {
            this._updateItemsGridVertical();
        }
    }

    /**网格布局是否更新 */
    private _isUpdateGrid(): boolean {
        //横向容错偏移量
        const OFFSET_FLOAT_X: number = this.node.width / 2;
        //纵向容错偏移量
        const OFFSET_FLOAT_Y: number = this.node.height / 2;
        let scrollOffsetY = Math.abs(this.getScrollOffset().y);
        let scrollOffsetX = Math.abs(this.getScrollOffset().x);
        //超出范围不更新
        if (scrollOffsetX - OFFSET_FLOAT_X > this.content.width - this.node.width || scrollOffsetY - OFFSET_FLOAT_Y > this.content.height - this.node.height) {
            return false;
        }
        return true;
    }

    /**更新网格布局的item-水平方向优先 */
    private _updateItemsGridHorizontal() {
        let scrollOffsetY = Math.abs(this.getScrollOffset().y);
        let visiableRow = Math.ceil(this.node.height / (this._itemInfo.height + this._layoutInfo._spaceY)) + 1;//加一行是为了向上滚动时底部不要留白
        let len = this._allData.length;
        let startRow = Math.floor((scrollOffsetY - this._layoutInfo._paddingTop) / (this._itemInfo.height + this._layoutInfo._spaceY));
        let endRow = startRow + visiableRow;
        let start = startRow * this.maxCol;
        let end = endRow * this.maxCol;
        start = start < 0 ? 0 : start;
        end = end > len ? len : end;
        let showData = this._allData.slice(start, end);
        this._loadItems(showData);
    }

    /**更新网格布局的item-垂直方向优先 */
    private _updateItemsGridVertical() {
        let scrollOffsetX = Math.abs(this.getScrollOffset().x);
        let visiableCol = Math.ceil(this.node.width / (this._itemInfo.width + this._layoutInfo._spaceX)) + 1;//加一列是为了向左滚动时右边不要留白
        let len = this._allData.length;
        let startCol = Math.floor((scrollOffsetX - this._layoutInfo._paddingLeft) / (this._itemInfo.width + this._layoutInfo._spaceX));
        let endCol = startCol + visiableCol;
        let start = startCol * this.maxRow;
        let end = endCol * this.maxRow;
        start = start < 0 ? 0 : start;
        end = end > len ? len : end;
        let showData = this._allData.slice(start, end);
        this._loadItems(showData);
    }

    /**更新垂直布局的item */
    private _updateItemsVertical() {
        let scrollOffsetY = Math.abs(this.getScrollOffset().y);
        //超出范围不更新
        if (scrollOffsetY > this.content.height - this.node.height) {
            return;
        }
        let len = this._allData.length;
        let visiableRow = Math.ceil(this.node.height / (this._itemInfo.height + this._layoutInfo._spaceY)) + 1;//加一行是为了向上滚动时底部不要留白
        //计算当前可见的行数,起始行
        let startRow = Math.floor((scrollOffsetY - this._layoutInfo._paddingTop) / (this._itemInfo.height + this._layoutInfo._spaceY));
        //计算结束行
        let endRow = startRow + visiableRow;
        let start = startRow;
        let end = endRow;
        start = start < 0 ? 0 : start;
        end = end > len ? len : end;
        let showData = this._allData.slice(start, end);
        this._loadItems(showData);
    }

    /**更新水平布局的item */
    private _updateItemsHorizontal() {
        let scrollOffsetX = Math.abs(this.getScrollOffset().x);
        //超出范围不更新
        if (scrollOffsetX > this.content.width - this.node.width) {
            return;
        }
        let len = this._allData.length;
        let visiableCol = Math.ceil(this.node.width / (this._itemInfo.width + this._layoutInfo._spaceX)) + 1;//加一列是为了向左滚动时右边不要留白
        //计算当前可见的列数,起始列
        let startCol = Math.floor((scrollOffsetX - this._layoutInfo._paddingLeft) / (this._itemInfo.width + this._layoutInfo._spaceX));
        //计算结束列
        let endCol = startCol + visiableCol;
        let start = startCol;
        let end = endCol;
        start = start < 0 ? 0 : start;
        end = end > len ? len : end;
        let showData = this._allData.slice(start, end);
        this._loadItems(showData);
    }

    /**加载items */
    private _loadItems(showData: any[]) {
        if (this.scheduleLoad) {
            this.stopLoadSchedule();
            this._loadQueue = [...showData];
            this._loadedCount = 0;
        }
        let vLen = showData.length;
        let cLen = this.content.childrenCount;
        if (cLen < vLen) {
            for (let i = cLen; i < vLen; i++) {
                let node = cc.instantiate(this.itemPrefab);
                node.parent = this.content;
            }
        }
        if (cLen > vLen) {
            for (let i = cLen - 1; i >= vLen; i--) {
                let node = this.content.children[i];
                node.opacity = 0;
            }
        }
        if (this.scheduleLoad) {
            this.startLoadSchedule();
        } else {
            for (let i = 0; i < vLen; i++) {
                let v = showData[i];
                let node = this.content.children[i];
                node.opacity = 255;
                let s = node.getComponent(ISGItemBaseCompnent);
                if (s) {
                    s.setData(v);
                }
                let key = v._k;
                node.x = this._itemPosMap[key].x || 0;
                node.y = this._itemPosMap[key].y || 0;
            }
        }
    }

    /**开始分帧加载 */
    private startLoadSchedule() {
        this.schedule(this.onScheduleLoad, 0.01);
    }

    /**停止分帧加载 */
    private stopLoadSchedule() {
        this.unschedule(this.onScheduleLoad);
        this._loadQueue = [];
    }

    /**分帧加载回调 */
    private onScheduleLoad = (dt) => {
        if (this._loadQueue.length > 0) {
            let len = this._loadQueue.length;
            let count = len > this.frameLoadCount ? this.frameLoadCount : len;
            let cLen = this.content.childrenCount;
            if (cLen < this._loadedCount + count) {
                for (let i = cLen; i < this._loadedCount + count; i++) {
                    let node = cc.instantiate(this.itemPrefab);
                    node.parent = this.content;
                }
            }
            for (let i = 0; i < count; i++) {
                let data = this._loadQueue.shift();
                let v = data;
                let node = this.content.children[this._loadedCount + i];
                node.opacity = 255;
                let s = node.getComponent(ISGItemBaseCompnent);
                if (s) {
                    s.setData(v);
                }
                let key = v._k;
                node.x = this._itemPosMap[key].x || 0;
                node.y = this._itemPosMap[key].y || 0;
            }
            this._loadedCount += count;
        } else {
            this.stopLoadSchedule();
        }
    }

}
