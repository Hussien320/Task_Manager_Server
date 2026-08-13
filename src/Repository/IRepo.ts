export type id = string
export interface IRepo<T> {
    create(item: T): Promise<id>;
    GetById(id: id): Promise<T >;
    GetAll(): Promise<T[]>;
    Update( item: T): Promise<id>;
    Delete(id: id): Promise<void>;

}