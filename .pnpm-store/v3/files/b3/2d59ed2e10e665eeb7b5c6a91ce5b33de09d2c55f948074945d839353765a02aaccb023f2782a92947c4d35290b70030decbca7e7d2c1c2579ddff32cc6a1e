export declare namespace NestiaSimulator {
    interface IProps {
        host: string;
        path: string;
        method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
        contentType: string;
    }
    const assert: (props: IProps) => {
        param: (name: string) => <T>(task: () => T) => void;
        query: <T>(task: () => T) => void;
        body: <T>(task: () => T) => void;
    };
}
