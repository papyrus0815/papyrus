import { IValidation } from "typia";
export interface IRequestFormDataProps<T> {
    files: Array<IRequestFormDataProps.IFile>;
    validator: IRequestFormDataProps.IAssert<T> | IRequestFormDataProps.IIs<T> | IRequestFormDataProps.IValidate<T>;
}
export declare namespace IRequestFormDataProps {
    interface IAssert<T> {
        type: "assert";
        assert: (input: FormData) => T;
    }
    interface IIs<T> {
        type: "is";
        is: (input: FormData) => T | null;
    }
    interface IValidate<T> {
        type: "validate";
        validate: (input: FormData) => IValidation<T>;
    }
    interface IFile {
        name: string;
        limit: number | null;
    }
}
