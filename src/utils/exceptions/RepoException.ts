export class ItemNotFoundException extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ItemNotFoundException";
    }
}

export class InvalidItemException extends Error {
    constructor(message: string) {
        super(message);
        this.name = "InvalidItemException";
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