export declare class HALSerializer {
    opts: any;
    schemas: any;
    constructor(opts?: any);
    validateOptions(options: string): any;
    register(type: any, schemaName: any, options: any): void;
    serialize(type: any, data: any, schemaName: any, extraOptions: any): any;
    serializeAsync(type: any, data: any, schema: any, extraData: any): Promise<unknown>;
    deserialize(type: any, data: any, schema: any): any;
    deserializeResource(type: any, data: any, schema: any): any;
    deserializeEmbedded(type: any, data: any, schema: any): any;
    serializeData(type: any, data: any, options: any): any;
    serializeAttributes(data: any, options: any): any;
    serializeEmbedded(data: any, options: any, links: any): any;
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
    processOptionsValues(data: any, options: any, additionalData?: any): Partial<any> | undefined;
    /**
     * Recursively convert object keys case
     *
     * @method HALSerializer#_convertCase
     * @private
     * @param {Object|Object[]|string} data to convert
     * @param {string} convertCaseOptions can be snake_case', 'kebab-case' or 'camelCase' format.
     * @return {Object}
     */
    _convertCase(data: any, convertCaseOptions: any): any;
}
