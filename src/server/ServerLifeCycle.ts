export default interface ServerLifeCycle{
    start():Promise<void>;
    stop():Promise<void>;
    dump():Promise<object>;
}