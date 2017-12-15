/**
 * Parts of this source were derived and modified from fast-react-render,
 * released under the MIT license.
 *
 * https://github.com/alt-j/fast-react-render
 *
 * Copyright (c) 2016 Andrey Morozov
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

/**
 * External dependencies
 */
import { includes, kebabCase } from 'lodash';

/**
 * Valid attribute types.
 *
 * @type {String[]}
 */
const ATTRS_TYPES = [
	'string',
	'boolean',
	'number',
];

/**
 * Element tags which can be self-closing.
 *
 * @type {String[]}
 */
const SELF_CLOSING_TAGS = [
	'area',
	'base',
	'br',
	'col',
	'command',
	'embed',
	'hr',
	'img',
	'input',
	'keygen',
	'link',
	'meta',
	'param',
	'source',
	'track',
	'wbr',
];

/**
 * Boolean attributes are attributes whose presence as being assigned is
 * meaningful, even if only empty.
 *
 * See: https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#boolean-attributes
 * Extracted from: https://html.spec.whatwg.org/multipage/indices.html#attributes-3
 *
 * [ ...document.querySelectorAll( '#attributes-1 > tbody > tr' ) ]
 *     .filter( ( tr ) => tr.lastChild.textContent.indexOf( 'Boolean attribute' ) !== -1 )
 *     .map( ( tr ) => tr.firstChild.textContent.trim() )
 *
 * @type {Array}
 */
const BOOLEAN_ATTRIBUTES = [
	'allowfullscreen',
	'allowpaymentrequest',
	'allowusermedia',
	'async',
	'autofocus',
	'autoplay',
	'checked',
	'controls',
	'default',
	'defer',
	'disabled',
	'formnovalidate',
	'hidden',
	'ismap',
	'itemscope',
	'loop',
	'multiple',
	'muted',
	'nomodule',
	'novalidate',
	'open',
	'open',
	'playsinline',
	'readonly',
	'required',
	'reversed',
	'selected',
	'typemustmatch',
];

/**
 * Enumerated attributes are attributes which must be of a specific value form.
 * Like boolean attributes, these are meaningful if specified, even if not of a
 * valid enumerated value.
 *
 * See: https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#enumerated-attribute
 * Extracted from: https://html.spec.whatwg.org/multipage/indices.html#attributes-3
 *
 * [ ...document.querySelectorAll( '#attributes-1 > tbody > tr' ) ]
 *     filter( ( tr ) => /("(.+?)";?\s*)+/.test( tr.lastChild.textContent ) )
 *     .map( ( tr ) => tr.firstChild.textContent.trim() )
 *
 * @type {Array}
 */
const ENUMERATED_ATTRIBUTES = [
	'autocomplete',
	'contenteditable',
	'crossorigin',
	'dir',
	'dir',
	'draggable',
	'enctype',
	'formenctype',
	'formmethod',
	'inputmode',
	'kind',
	'method',
	'preload',
	'sandbox',
	'scope',
	'shape',
	'spellcheck',
	'step',
	'translate',
	'type',
	'type',
	'workertype',
	'wrap',
];

/**
 * Returns an escaped attribute value.
 *
 * @param  {String} value Attribute value
 * @return {String}       Escaped attribute value
 */
function escapeAttr( value ) {
	return value.replace( /&/g, '&amp;' ).replace( /"/g, '&quot;' );
}

/**
 * Returns true if the specified string is prefixed by one of an array of
 * possible prefixes.
 *
 * @param  {String}   string   String to check
 * @param  {String[]} prefixes Possible prefixes
 * @return {Boolean}           Whether string has prefix
 */
function hasPrefixes( string, prefixes ) {
	return prefixes.some( ( prefix ) => string.indexOf( prefix ) === 0 );
}

/**
 * Serializes a React element to string.
 *
 * @param   {ReactElement} element Element to serialize
 * @returns {String}               Serialized element
 */
function renderElement( element ) {
	if ( null === element || undefined === element || false === element ) {
		return '';
	}

	if ( Array.isArray( element ) ) {
		return element.map( renderElement ).join( '' );
	}

	if ( typeof element === 'string' ) {
		return element;
	}

	if ( typeof element === 'number' ) {
		return element.toString();
	}

	const { type, props } = element;

	if ( typeof type === 'string' ) {
		return renderNativeComponent( type, props );
	} else if ( typeof type === 'function' ) {
		if ( type.prototype && typeof type.prototype.render === 'function' ) {
			return renderComponent( type, props );
		}

		return renderElement( type( props ) );
	}

	return '';
}

/**
 * Serializes a native component type to string.
 *
 * @param   {String} type  Native component type to serialize
 * @param   {Object} props Props object
 * @returns {String}       Serialized element
 */
function renderNativeComponent( type, props ) {
	let content = '';
	if ( type === 'textarea' ) {
		content = renderChildren( [ props.value ] );
	} else if ( props.dangerouslySetInnerHTML ) {
		content = props.dangerouslySetInnerHTML.__html;
	} else if ( typeof props.children !== 'undefined' ) {
		content = renderChildren(
			Array.isArray( props.children ) ? props.children : [].concat( props.children )
		);
	}

	const attrs = renderAttrs( props );

	if ( includes( SELF_CLOSING_TAGS, type ) ) {
		return '<' + type + attrs + '/>' + content;
	}

	return '<' + type + attrs + '>' + content + '</' + type + '>';
}

/**
 * Serializes a non-native component type to string.
 *
 * @param   {Function} Component Component type to serialize
 * @param   {Object}   props     Props object
 * @returns {String}             Serialized element
 */
function renderComponent( Component, props ) {
	const instance = new Component( props );

	if ( typeof instance.componentWillMount === 'function' ) {
		instance.componentWillMount();
	}

	const html = renderElement( instance.render() );

	return html;
}

/**
 * Serializes an array of children to string.
 *
 * @param   {Array}  children Children to serialize
 * @returns {String}          Serialized children
 */
function renderChildren( children ) {
	let str = '';

	for ( let i = 0; i < children.length; i++ ) {
		const child = children[ i ];

		if ( typeof child === 'string' ) {
			str += child;
		} else if ( Array.isArray( child ) ) {
			str += renderChildren( child );
		} else if ( typeof child === 'object' && child ) {
			str += renderElement( child );
		} else if ( typeof child === 'number' ) {
			str += child;
		}
	}

	return str;
}

/**
 * Renders a props object as a string of HTML attributes.
 *
 * @param   {Object} props Props object
 * @returns {String}       Attributes string
 */
function renderAttrs( props ) {
	let str = '';

	for ( const key in props ) {
		const value = key === 'style' ? renderStyle( props[ key ] ) : props[ key ];

		const isBooleanAttr = (
			( typeof value === 'boolean' && hasPrefixes( key, [ 'data-', 'aria-' ] ) ) ||
			includes( BOOLEAN_ATTRIBUTES, key )
		);

		const isAsIsRenderAttr = (
			isBooleanAttr ||
			'src' === key ||
			includes( ENUMERATED_ATTRIBUTES, key )
		);

		if ( ( ! value && ! isAsIsRenderAttr ) || shouldIgnoreAttr( key ) ||
				! includes( ATTRS_TYPES, typeof value ) ) {
			continue;
		}

		let attr = key;
		if ( key === 'htmlFor' ) {
			attr = 'for';
		} else if ( key === 'className' ) {
			attr = 'class';
		}

		str += ' ' + attr;

		if ( typeof value !== 'boolean' || isBooleanAttr ) {
			str += '="' + ( typeof value === 'string' ? escapeAttr( value ) : value ) + '"';
		}
	}

	return str;
}

/**
 * Renders a style object as a string attribute value.
 *
 * @param   {Object} style Style object
 * @returns {String}       Style attribute value
 */
function renderStyle( style ) {
	let result = '';

	for ( const property in style ) {
		const value = style[ property ];
		if ( null === value || undefined === value ) {
			continue;
		}

		if ( result ) {
			result += ';';
		}

		result += kebabCase( property ) + ':' + value;
	}

	return result;
}

/**
 * Returns true if the given prop name should be ignored in attributes
 * serialization, or false otherwise.
 *
 * @param   {String}  attr Attribute to check
 * @returns {Boolean}      Whether attribute should be ignored
 */
function shouldIgnoreAttr( attr ) {
	return 'key' === attr || 'children' === attr;
}

export default renderElement;
