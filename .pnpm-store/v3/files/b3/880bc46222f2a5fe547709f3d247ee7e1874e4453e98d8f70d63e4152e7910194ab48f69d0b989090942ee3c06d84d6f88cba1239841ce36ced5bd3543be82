"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MigrateFetcher = void 0;
var PlainFetcher_1 = require("./PlainFetcher");
/**
 * Use `HttpMigration.execute()` function of `@samchon/openapi` instead.
 *
 * This module would be removed in the next major update.
 *
 * @deprecated
 */
var MigrateFetcher;
(function (MigrateFetcher) {
    function request(props) {
        return __awaiter(this, void 0, void 0, function () {
            var length;
            var _a, _b, _c, _d;
            return __generator(this, function (_e) {
                length = props.route.parameters.length +
                    (props.route.query ? 1 : 0) +
                    (props.route.body ? 1 : 0);
                if (props.arguments.length !== length)
                    throw new Error("Error on MigrateFetcher.request(): arguments length is not matched with the route (expected: ".concat(length, ", actual: ").concat(props.arguments.length, ")."));
                else if (((_a = props.route.body) === null || _a === void 0 ? void 0 : _a["x-nestia-encrypted"]) === true ||
                    ((_b = props.route.success) === null || _b === void 0 ? void 0 : _b["x-nestia-encrypted"]) === true)
                    throw new Error("Error on MigrateFetcher.request(): encrypted API is not supported yet.");
                return [2 /*return*/, PlainFetcher_1.PlainFetcher.fetch(props.connection, {
                        method: props.route.method.toUpperCase(),
                        path: getPath(props),
                        template: props.route.path,
                        status: null,
                        request: props.route.body
                            ? {
                                encrypted: false,
                                type: props.route.body.type,
                            }
                            : null,
                        response: {
                            encrypted: false,
                            type: (_d = (_c = props.route.success) === null || _c === void 0 ? void 0 : _c.type) !== null && _d !== void 0 ? _d : "application/json",
                        },
                    }, props.route.body ? props.arguments.at(-1) : undefined)];
            });
        });
    }
    MigrateFetcher.request = request;
    function propagate(props) {
        return __awaiter(this, void 0, void 0, function () {
            var length;
            var _a, _b, _c, _d;
            return __generator(this, function (_e) {
                length = props.route.parameters.length +
                    (props.route.query ? 1 : 0) +
                    (props.route.body ? 1 : 0);
                if (props.arguments.length !== length)
                    throw new Error("Error on MigrateFetcher.propagate(): arguments length is not matched with the route (expected: ".concat(length, ", actual: ").concat(props.arguments.length, ")."));
                else if (((_a = props.route.body) === null || _a === void 0 ? void 0 : _a["x-nestia-encrypted"]) === true ||
                    ((_b = props.route.success) === null || _b === void 0 ? void 0 : _b["x-nestia-encrypted"]) === true)
                    throw new Error("Error on MigrateFetcher.propagate(): encrypted API is not supported yet.");
                return [2 /*return*/, PlainFetcher_1.PlainFetcher.propagate(props.connection, {
                        method: props.route.method.toUpperCase(),
                        path: getPath(props),
                        template: props.route.path,
                        status: null,
                        request: props.route.body
                            ? {
                                encrypted: false,
                                type: props.route.body.type,
                            }
                            : null,
                        response: {
                            encrypted: false,
                            type: (_d = (_c = props.route.success) === null || _c === void 0 ? void 0 : _c.type) !== null && _d !== void 0 ? _d : "application/json",
                        },
                    }, props.route.body ? props.arguments.at(-1) : undefined)];
            });
        });
    }
    MigrateFetcher.propagate = propagate;
    function getPath(props) {
        var path = props.route.emendedPath;
        props.route.parameters.forEach(function (p, i) {
            path = path.replace(":".concat(p.key), props.arguments[i]);
        });
        if (props.route.query)
            path += getQueryPath(props.arguments[props.route.parameters.length]);
        return path;
    }
    function getQueryPath(query) {
        var e_1, _a;
        var variables = new URLSearchParams();
        var _loop_1 = function (key, value) {
            if (undefined === value)
                return "continue";
            else if (Array.isArray(value))
                value.forEach(function (elem) { return variables.append(key, String(elem)); });
            else
                variables.set(key, String(value));
        };
        try {
            for (var _b = __values(Object.entries(query)), _c = _b.next(); !_c.done; _c = _b.next()) {
                var _d = __read(_c.value, 2), key = _d[0], value = _d[1];
                _loop_1(key, value);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return 0 === variables.size ? "" : "?".concat(variables.toString());
    }
})(MigrateFetcher || (exports.MigrateFetcher = MigrateFetcher = {}));
//# sourceMappingURL=MigrateFetcher.js.map