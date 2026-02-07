import { IFetchRoute } from "./IFetchRoute";
export interface IFetchEvent {
    route: IFetchRoute<"DELETE" | "GET" | "HEAD" | "PATCH" | "POST" | "PUT">;
    path: string;
    status: number | null;
    input: any;
    output: any;
    started_at: Date;
    respond_at: Date | null;
    completed_at: Date;
}
