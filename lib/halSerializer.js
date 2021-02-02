'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.HALSerializer = void 0;
const _ = require("lodash");
const joi = require("joi");
const intoStream = require("into-stream");
class HALSerializer {
    constructor(opts) {
        this.opts = opts || {};
        this.schemas = {};
    }
    validateOptions(options) {
        const optionsSchema = joi
            .object({
            blacklist: joi.array().items(joi.string()).single().default([]),
            whitelist: joi.array().items(joi.string()).single().default([]),
            links: joi.alternatives([joi.func(), joi.object()]).default({}),
            associations: joi.alternatives([joi.func(), joi.object()]).default({}),
            embedded: joi
                .object()
                .pattern(/.+/, joi.object({
                type: joi.string().required(),
                schema: joi.string().default('default'),
                links: joi.alternatives([joi.func(), joi.object()]).default({}),
                associations: joi.alternatives([joi.func(), joi.object()]).default({}),
            }))
                .default({}),
            topLevelLinks: joi.alternatives([joi.func(), joi.object()]).default({}),
            topLeveAssociations: joi.alternatives([joi.func(), joi.object()]).default({}),
            topLevelMeta: joi.alternatives([joi.func(), joi.object()]).default({}),
            convertCase: joi.string(),
        })
            .required();
        // const validated = joi.validate(options, optionsSchema);
        const validated = optionsSchema.validate(options);
        if (validated.error) {
            throw new Error(validated.error.toString());
        }
        return validated.value;
    }
    register(type, schemaName, options) {
        if (_.isObject(schemaName)) {
            options = schemaName;
            schemaName = 'default';
        }
        const name = schemaName || 'default';
        const opts = this.validateOptions(_.defaults({}, options));
        _.set(this.schemas, [type, name].join('.'), opts);
    }
    serialize(type, data, schemaName, extraOptions) {
        // Support optional arguments
        if (arguments.length === 3) {
            if (_.isPlainObject(schemaName)) {
                extraOptions = schemaName;
                schemaName = 'default';
            }
        }
        const schema = schemaName || 'default';
        const extraOpts = extraOptions || {};
        if (!this.schemas[type]) {
            throw new Error('No type registered for ' + type);
        }
        if (schema && !this.schemas[type][schema]) {
            throw new Error('No schema ' + schema + ' registered for ' + type);
        }
        const serialized = {};
        serialized._links = this.processOptionsValues(extraOpts, this.schemas[type][schema].topLevelLinks);
        serialized._associations = this.processOptionsValues(extraOpts, this.schemas[type][schema].topLevelAssociations);
        _.assign(serialized, this.processOptionsValues(extraOpts, this.schemas[type][schema].topLevelMeta));
        _.assign(serialized, this.serializeData(type, data, this.schemas[type][schema]));
        return serialized;
    }
    // tslint:disable-next-line
    serializeAsync(type, data, schema, extraData) {
        // Support optional arguments
        if (arguments.length === 3) {
            if (_.isPlainObject(schema)) {
                extraData = schema;
                schema = 'default';
            }
        }
        schema = schema || 'default';
        const extraOpts = extraData || {};
        if (!this.schemas[type]) {
            throw new Error('No type registered for ' + type);
        }
        if (schema && !this.schemas[type][schema]) {
            throw new Error('No schema ' + schema + ' registered for ' + type);
        }
        return new Promise((resolve, reject) => {
            if (!Array.isArray(data)) {
                const serialized = {};
                serialized._links = this.processOptionsValues(extraOpts, this.schemas[type][schema].topLevelLinks);
                serialized._associations = this.processOptionsValues(extraOpts, this.schemas[type][schema].topLevelAssociations);
                _.assign(serialized, this.processOptionsValues(extraOpts, this.schemas[type][schema].topLevelMeta));
                _.assign(serialized, this.serializeData(type, data, this.schemas[type][schema]));
                return resolve(serialized);
            }
            const serializedData = [];
            const stream = intoStream.object(data);
            stream.on('data', (streamData) => {
                serializedData.push(this.serializeData(type, streamData, this.schemas[type][schema]));
            });
            stream.on('end', () => {
                const serialized = {};
                serialized._links = this.processOptionsValues(extraOpts, this.schemas[type][schema].topLevelLinks);
                serialized._associations = this.processOptionsValues(extraOpts, this.schemas[type][schema].topLevelAssociations);
                _.assign(serialized, this.processOptionsValues(extraOpts, this.schemas[type][schema].topLevelMeta));
                serialized._embedded = {};
                serialized._embedded[type] = serializedData;
                return resolve(serialized);
            });
            stream.on('error', reject);
        });
    }
    deserialize(type, data, schema) {
        schema = schema || 'default';
        if (!this.schemas[type]) {
            throw new Error(`No type registered for ${type}`);
        }
        if (schema && !this.schemas[type][schema]) {
            throw new Error(`No schema ${schema} registered for ${type}`);
        }
        let deserializedData;
        if (data) {
            if (data._embedded && Array.isArray(data._embedded[type])) {
                deserializedData = data._embedded[type].map((resource) => this.deserializeResource(type, resource, schema));
            }
            else {
                deserializedData = this.deserializeResource(type, data, schema);
            }
        }
        return deserializedData;
    }
    deserializeResource(type, data, schema) {
        const resourceOpts = this.schemas[type][schema];
        const deserializedData = {};
        Object.assign(deserializedData, _.pick(data, _.difference(Object.keys(data), ['_links', '_associations', '_embedded'])));
        // Deserialize relationships
        if (data._embedded) {
            Object.keys(data._embedded).forEach((relationship) => {
                const value = data._embedded[relationship];
                const relationshipOpts = resourceOpts.embedded[relationship];
                if (relationshipOpts) {
                    if (_.isArray(value)) {
                        deserializedData[relationship] = value.map((d) => this.deserializeEmbedded(relationshipOpts.type, d, relationshipOpts.schema));
                    }
                    else {
                        deserializedData[relationship] = this.deserializeEmbedded(relationshipOpts.type, value, relationshipOpts.schema);
                    }
                }
            });
        }
        return deserializedData;
    }
    deserializeEmbedded(type, data, schema) {
        let deserializedEmbedded;
        if (Object.keys(data).length === 1 && data._links && data._links.self && data._links.self.href) {
            deserializedEmbedded = data._links.self.href.split('/').pop();
        }
        else {
            deserializedEmbedded = this.deserializeResource(type, data, schema);
        }
        if (Object.keys(data).length === 1 &&
            data._associations &&
            data._associations.self &&
            data._associations.self.href) {
            deserializedEmbedded = data._associations.self.href.split('/').pop();
        }
        else {
            deserializedEmbedded = this.deserializeResource(type, data, schema);
        }
        return !_.isEmpty(deserializedEmbedded) ? deserializedEmbedded : undefined;
    }
    serializeData(type, data, options) {
        // Empty data
        if (_.isEmpty(data)) {
            // Return [] or null
            return _.isArray(data) ? data : null;
        }
        // Array data
        if (_.isArray(data)) {
            const serializedCollection = {};
            serializedCollection._embedded = {};
            serializedCollection._embedded[type] = data.map((d) => this.serializeData(type, d, options));
            return serializedCollection;
        }
        // Single data
        const serializedData = {};
        serializedData._links = this.processOptionsValues(data, options.links);
        serializedData._associations = this.processOptionsValues(data, options.associations);
        _.assign(serializedData, this.serializeAttributes(data, options));
        serializedData._embedded = this.serializeEmbedded(data, options, serializedData._links, serializedData._associations);
        return serializedData;
    }
    serializeAttributes(data, options) {
        // Filter whitelist attributes
        if (options.whitelist.length > 0) {
            data = _.pick(data, options.whitelist);
        }
        // Remove embedded and blacklist attributes
        let serializedAttributes = _.pick(data, _.difference(Object.keys(data), _.concat(Object.keys(options.embedded), options.blacklist)));
        if (options.convertCase) {
            serializedAttributes = this._convertCase(serializedAttributes, options.convertCase);
        }
        return serializedAttributes;
    }
    serializeEmbedded(data, options, links, associations) {
        const serializedEmbedded = {};
        _.forOwn(options.embedded, (rOptions, embedded) => {
            const schema = rOptions.schema || 'default';
            const serializeEmbeddedResource = this.serializeEmbeddedResource(embedded, data[embedded], rOptions, this.schemas[options.embedded[embedded].type][schema], links, associations, data);
            embedded = options.convertCase ? this._convertCase(embedded, options.convertCase) : embedded;
            if (!_.isEmpty(serializeEmbeddedResource)) {
                _.set(serializedEmbedded, embedded, serializeEmbeddedResource);
            }
        });
        return !_.isEmpty(serializedEmbedded) ? serializedEmbedded : undefined;
    }
    serializeEmbeddedResource(embeddedType, embeddedData, rOptions, typeOptions, links, associations, data) {
        // Empty embedded data
        if (_.isEmpty(embeddedData)) {
            // Return [] or null
            return _.isArray(embeddedData) ? embeddedData : null;
        }
        // To-many embedded resources
        if (_.isArray(embeddedData)) {
            links[embeddedType] = [];
            associations[embeddedType] = [];
            const arrayEmbedded = _.compact(embeddedData.map((d) => this.serializeEmbeddedResource(embeddedType, d, rOptions, typeOptions, links, associations, data)));
            if (_.isEmpty(links[embeddedType])) {
                delete links[embeddedType];
            }
            if (_.isEmpty(associations[embeddedType])) {
                delete associations[embeddedType];
            }
            return !_.isEmpty(arrayEmbedded) ? arrayEmbedded : undefined;
        }
        // To-One embedded resource
        let serializedEmbedded;
        let rLinks;
        let rAssociations;
        rLinks = this.processOptionsValues(embeddedData, rOptions.links, data);
        rAssociations = this.processOptionsValues(embeddedData, rOptions.associations, data);
        if (_.isPlainObject(embeddedData)) {
            // Embedded resource has been populated
            serializedEmbedded = {};
            serializedEmbedded._links = rLinks;
            serializedEmbedded._associations = rAssociations;
            _.assign(serializedEmbedded, this.serializeData(rOptions.type, embeddedData, typeOptions));
        }
        // Populate links
        if (!_.isUndefined(rLinks)) {
            if (_.isArray(links[embeddedType])) {
                links[embeddedType].push(rLinks);
            }
            else {
                links[embeddedType] = rLinks;
            }
        }
        // Populate association
        if (!_.isUndefined(rAssociations)) {
            if (_.isArray(associations[embeddedType])) {
                associations[embeddedType].push(rAssociations);
            }
            else {
                associations[embeddedType] = rAssociations;
            }
        }
        return !_.isEmpty(serializedEmbedded) ? serializedEmbedded : undefined;
    }
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
    processOptionsValues(data, options, additionalData) {
        let processedOptions;
        if (_.isFunction(options)) {
            processedOptions = options(data, additionalData);
        }
        else {
            processedOptions = _.mapValues(options, (value) => {
                let processed;
                if (_.isFunction(value)) {
                    processed = value(data, additionalData);
                }
                else {
                    processed = value;
                }
                return processed;
            });
        }
        // Clean all undefined values
        processedOptions = _.omitBy(processedOptions, _.isUndefined);
        return !_.isEmpty(processedOptions) ? processedOptions : undefined;
    }
    /**
     * Recursively convert object keys case
     *
     * @method HALSerializer#_convertCase
     * @private
     * @param {Object|Object[]|string} data to convert
     * @param {string} convertCaseOptions can be snake_case', 'kebab-case' or 'camelCase' format.
     * @return {Object}
     */
    _convertCase(data, convertCaseOptions) {
        let converted;
        if (_.isArray(data) || _.isPlainObject(data)) {
            converted = _.transform(data, (result, value, key) => {
                if (_.isArray(value) || _.isPlainObject(value)) {
                    result[this._convertCase(key, convertCaseOptions)] = this._convertCase(value, convertCaseOptions);
                }
                else {
                    result[this._convertCase(key, convertCaseOptions)] = value;
                }
            });
        }
        else {
            switch (convertCaseOptions) {
                case 'snake_case':
                    converted = _.snakeCase(data);
                    break;
                case 'kebab-case':
                    converted = _.kebabCase(data);
                    break;
                case 'camelCase':
                    converted = _.camelCase(data);
                    break;
                default: // Do nothing
            }
        }
        return converted;
    }
}
exports.HALSerializer = HALSerializer;
