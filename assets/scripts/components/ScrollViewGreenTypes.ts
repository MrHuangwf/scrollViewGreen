/**子节点数据结构 */
export type SGItemData<T> = T & { _k: string };

/**子组件基类 */
export class ISGItemBaseCompnent<T> extends cc.Component {

    /**数据存储 */
    private _d: SGItemData<T>;

    /**获取唯一索引k */
    get k(): string {
        return this._d._k;
    }

    /**设置数据 */
    setData(p: SGItemData<T>) {
        this._d = p;
    }

}

//测试数据
export type TestSGItemData = SGItemData<{
    /**content */
    content: string;
}>;