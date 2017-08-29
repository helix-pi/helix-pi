declare module "cycle-idb";

/*
declare module 'cycle-idb' {
  export default function makeIDBDriver(
    name: string,
    version: number,
    upgradeF: (upgrade: any) => void
  ): IDBDriver;

  type IDBDriver = (sink$: IDBSink) => IDBSource;
  type IDBSink = Stream<IDBAction>;

  type IDBAction = Put | Update | Delete | Add | Clear;

  type Put = {};
  type Update = {};
  type Delete = {};
  type Add = {};
  type Clear = {};

  export function $put(name: string, obj: any): Put;
  export function $update(name: string, obj: any): Update;
  export function $delete(name: string, obj: any): Delete;
  export function $add(name: string, obj: any): Add;
  export function $Clear(name: string): Clear;

  interface IDBSource {
    store(name: string): QuerySource;
  }

  interface QuerySource {
    getAll(): Stream<any>;
  }
}
*/
