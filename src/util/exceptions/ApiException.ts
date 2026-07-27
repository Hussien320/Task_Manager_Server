export class ApiException extends Error {
    public status:number;
    constructor(status:number, message:string,error:Error) {
        super(message);
        this.status = status;
        this.name = "ApiException";
        this.stack = error.stack;
        this.message=`${message}: ${error.message}`;
    }
}