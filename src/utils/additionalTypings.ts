export class RateLimitInfo {
    /** Timeout in ms */
    public timeout:number;
    /** Number of requests that can be made to this endpoint */
    public limit:number;
    /** Delta-T in ms between your system and Discord servers */
    public timeDifference:number;
    /** HTTP method used for request that triggered this event */
    public method:string;
    /** Path used for request that triggered this event */
    public path:string;
    /** Route used for request that triggered this event */
    public route:string;
}