/**
 * External dependencies
 */
import scrollIntoView from 'dom-scroll-into-view';

/**
 * WordPress dependencies
 */
import { Component } from '@wordpress/element';
import { query } from '@wordpress/data';

class MultiSelectScrollIntoView extends Component {
	componentDidUpdate() {
		// Relies on expectation that `componentDidUpdate` will only be called
		// if value of `extentUID` changes.
		this.scrollIntoView();
	}

	/**
	 * Ensures that if a multi-selection exists, the extent of the selection is
	 * visible within the viewport.
	 *
	 * @return {void}
	 */
	scrollIntoView() {
		const { extentUID } = this.props;
		if ( ! extentUID ) {
			return;
		}

		const extentNode = document.querySelector( '[data-block="' + extentUID + '"]' );
		if ( ! extentNode ) {
			return;
		}

		scrollIntoView(
			extentNode,
			extentNode.closest( '.edit-post-layout__content' ),
			{ onlyScrollIfNeeded: true }
		);
	}

	render() {
		return null;
	}
}

export default query( ( select ) => {
	return {
		extentUID: select( 'core/editor', 'getLastMultiSelectedBlockUid' ),
	};
} )( MultiSelectScrollIntoView );
