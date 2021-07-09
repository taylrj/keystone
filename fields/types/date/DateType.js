var FieldType = require('../Type');
var moment = require('moment');
var util = require('util');

/**
 * Date FieldType Constructor
 * @extends Field
 * @api public
 */

function date(list, path, options) {
  this._nativeType = Date;
  this._underscoreMethods = ['format', 'moment', 'parse'];
  this._fixedSize = 'medium';
  this._properties = ['formatString', 'yearRange', 'inputFormat'];
  this.parseFormatString = options.inputFormat || 'YYYY-MM-DD ZZ';
  this.formatString = (options.format === false) ? false : (options.format || 'Do MMM YYYY');

  this.yearRange = options.yearRange;
  if (this.formatString && typeof this.formatString !== 'string') {
    throw new Error('FieldType.Date: options.format must be a string.');
  }
  date.super_.call(this, list, path, options);
}
util.inherits(date, FieldType);

/**
 * Add filters to a query
 */
date.prototype.addFilterToQuery = function(filter, query) {
  query = query || {};
  if (filter.mode === 'between') {

    if (filter.after && filter.before) {

      filter.after = moment(filter.after);
      filter.before = moment(filter.before);

      if (filter.after.isValid() && filter.before.isValid()) {
        query[this.path] = {
          $gte: filter.after.startOf('day').toDate(),
          $lte: filter.before.endOf('day').toDate(),
        };
      }
    }

  } else if (filter.value) {

    var day = {
      moment: moment(filter.value),
    };
    day.start = day.moment.startOf('day').toDate();
    day.end = moment(filter.value).endOf('day').toDate();

    if (day.moment.isValid()) {
      if (filter.mode === 'after') {
        query[this.path] = { $gt: day.end };
      } else if (filter.mode === 'before') {
        query[this.path] = { $lt: day.start };
      } else {
        query[this.path] = { $gte: day.start, $lte: day.end };
      }
    }

  }

  if (filter.inverted) {
    query[this.path] = { $not: query[this.path] };
  }

  return query;
};

/**
 * Formats the field value
 */
date.prototype.format = function(item, format) {
  if (format || this.formatString) {
    return item.get(this.path) ? this.moment(item).format(format || this.formatString) : '';
  } else {
    return item.get(this.path) || '';
  }
};

/**
 * Returns a new `moment` object with the field value
 */
date.prototype.moment = function(item) {
  var m = moment(item.get(this.path));
  return m;
};

/**
 * Parses input using moment, sets the value, and returns the moment object.
 */
date.prototype.parse = function(item) {
  var m = moment;
  var newValue = m.apply(m, Array.prototype.slice.call(arguments, 1));
  item.set(this.path, (newValue && newValue.isValid()) ? newValue.toDate() : null);
  return newValue;
};

/**
 * Checks that a valid date has been provided in a data object
 * An empty value clears the stored value and is considered valid
 */
date.prototype.inputIsValid = function(data, required, item) {
  if (!(this.path in data) && item && item.get(this.path)) return true;
  var newValue = moment(data[this.path], this.parseFormatString);
  if (required && (!newValue.isValid())) {
    return false;
  } else if (data[this.path] && newValue && !newValue.isValid()) {
    return false;
  } else {
    return true;
  }
};

/**
 * Updates the value for this field in the item from a data object
 */
date.prototype.updateItem = function(item, data, callback) {
  if (!(this.path in data)) {
    return process.nextTick(callback);
  }
  var m = moment;
  var newValue = m(data[this.path], this.parseFormatString);
  if (newValue.isValid()) {
    if (!item.get(this.path) || !newValue.isSame(item.get(this.path))) {
      item.set(this.path, newValue.toDate());
    }
  } else if (item.get(this.path)) {
    item.set(this.path, null);
  }
  process.nextTick(callback);
};

/* Export Field Type */
module.exports = date;
