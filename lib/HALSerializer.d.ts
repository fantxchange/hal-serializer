export = HALSerializer;
declare class HALSerializer {
    constructor(opts: any);
    opts: any;
    schemas: {};
    validateOptions(options: any): any;
    register(type: any, schemaName: any, options: any): void;
    serialize(type: any, data: any, schemaName: any, extraOptions: any, ...args: any[]): {
        _links: Object;
    };
    serializeAsync(type: any, data: any, schema: any, extraData: any, ...args: any[]): Promise<any>;
    deserialize(type: any, data: any, schema: any): any;
    deserializeResource(type: any, data: any, schema: any): {};
    deserializeEmbedded(type: any, data: any, schema: any): any;
    serializeData(type: any, data: any, options: any): any;
    serializeAttributes(data: any, options: any): any;
    serializeEmbedded(data: any, options: any, links: any): {} | undefined;
    serializeEmbeddedResource(embeddedType: any, embeddedData: any, rOptions: any, typeOptions: any, links: any, data: any): any;
    /**
     * Process options values.
     * Allows options to be an object or a function.
     *
     * @method HALSerializer#processOptionsValues
     * @private
     * @param {Object} data data passed to functions options
     * @param {Object} options configuration options.
     * @param {Object} additionalData additional data passed to functions options
     * @return {Object}
     */
    private processOptionsValues;
    /**
     * Recursively convert object keys case
     *
     * @method HALSerializer#_convertCase
     * @private
     * @param {Object|Object[]|string} data to convert
     * @param {string} convertCaseOptions can be snake_case', 'kebab-case' or 'camelCase' format.
     * @return {Object}
     */
    private _convertCase;
}
