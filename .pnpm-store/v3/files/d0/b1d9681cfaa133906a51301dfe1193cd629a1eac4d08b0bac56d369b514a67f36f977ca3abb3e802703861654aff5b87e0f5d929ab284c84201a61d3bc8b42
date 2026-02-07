import { IHttpMigrateRoute } from "@samchon/openapi";
import { IConnection } from "./IConnection";
import { IPropagation } from "./IPropagation";
/**
 * Use `HttpMigration.execute()` function of `@samchon/openapi` instead.
 *
 * This module would be removed in the next major update.
 *
 * @deprecated
 */
export declare namespace MigrateFetcher {
    interface IProps {
        route: IHttpMigrateRoute;
        connection: IConnection;
        arguments: any[];
    }
    function request(props: IProps): Promise<any>;
    function propagate(props: IProps): Promise<IPropagation.IBranch<boolean, number, any>>;
}
