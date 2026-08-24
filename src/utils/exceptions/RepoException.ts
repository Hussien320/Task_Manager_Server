export class ItemNotFoundException extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ItemNotFoundException";
    }
}



export class DBException extends Error {
    constructor(message: string,error:Error) {
        super(message);
        this.name = "DBException";
        this.stack=error.stack;
        this.message=`${message}: ${error.message}`;
    }  
} 
    export class ItemExists extends Error {
    constructor() {
        super('item arleady exists');
        this.name = "ItemExists";
        
    }  
}