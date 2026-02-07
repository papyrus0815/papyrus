"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NestiaSimulator = void 0;
var HttpError_1 = require("./HttpError");
var NestiaSimulator;
(function (NestiaSimulator) {
    NestiaSimulator.assert = function (props) {
        return {
            param: param(props),
            query: query(props),
            body: body(props),
        };
    };
    var param = function (props) {
        return function (name) {
            return function (task) {
                validate(function (exp) { return "URL parameter \"".concat(name, "\" is not ").concat(exp.expected, " type."); })(props)(task);
            };
        };
    };
    var query = function (props) {
        return function (task) {
            return validate(function () { return "Request query parameters are not following the promised type."; })(props)(task);
        };
    };
    var body = function (props) {
        return function (task) {
            return validate(function () { return "Request body is not following the promised type."; })(props)(task);
        };
    };
    var validate = function (message, path) {
        return function (props) {
            return function (task) {
                try {
                    task();
                }
                catch (exp) {
                    if (isTypeGuardError(exp))
                        throw new HttpError_1.HttpError(props.method, props.host + props.path, 400, {
                            "Content-Type": props.contentType,
                        }, JSON.stringify({
                            method: exp.method,
                            path: path !== null && path !== void 0 ? path : exp.path,
                            expected: exp.expected,
                            value: exp.value,
                            message: message(exp),
                        }));
                    throw exp;
                }
            };
        };
    };
})(NestiaSimulator || (exports.NestiaSimulator = NestiaSimulator = {}));
var isTypeGuardError = function (input) {
    return "string" === typeof input.method &&
        (undefined === input.path || "string" === typeof input.path) &&
        "string" === typeof input.expected &&
        "string" === typeof input.name &&
        "string" === typeof input.message &&
        (undefined === input.stack || "string" === typeof input.stack);
};
//# sourceMappingURL=NestiaSimulator.js.map