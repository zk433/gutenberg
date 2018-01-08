import store from '../store';
import {
	getCurrentPost,
	getEditedPostTitle,
	getEditedPostExcerpt,
	getEditedPostContent,
} from '../store/selectors';
import {
	toggleAutosave,
	removeNotice,
	toggleNetworkIsConnected,
	showDisconnectionNotice,
} from '../store/actions';

import { compact } from 'lodash';

/**
 * WordPress dependencies
 */
import { doAction } from '@wordpress/hooks';

const DISCONNECTION_NOTICE_ID = 'DISCONNECTION_NOTICE_ID';

export function setupHeartbeat() {
	const $document = jQuery( document );
	/**
	 * Configure heartbeat to refresh the wp-api nonce, keeping the editor authorization intact.
	 *
	 * @todo update the _wpnonce used by autosaves.
	 */
	$document.on( 'heartbeat-tick', ( event, response ) => {
		if ( response[ 'rest-nonce' ] ) {
			window.wpApiSettings.nonce = response[ 'rest-nonce' ];
		}
	} );

	/**
	 * Concatenate the title, content and excerpt.
	 *
	 * This is used to track changes when auto-saving.
	 *
	 * @since 1.9.0
	 *
	 * @param {Object} state The current state.
	 *
	 * @returns {string} A concatenated string with title, content and excerpt.
	 */
	const getCompareString = function( state ) {
		return compact( [
			getEditedPostTitle( state ),
			getEditedPostContent( state ),
			getEditedPostExcerpt( state ),
		] ).join( '::' );
	};

	/**
	 * Configure Heartbeat autosaves.
	 */
	const { dispatch, getState } = store;

	let compareString;
	let lastCompareString;

	/**
	 * Autosave 'save' function that pulls content from Gutenberg state. Based on `wp.autosave.save`.
	 *
	 * @since 1.9.0
	 *
	 * @returns {Object|bool} postData The autosaved post data to send, or false if no autosave is needed.
	 */
	const save = function() {
		// Bail early if autosaving is suspended or saving is blocked.
		if ( wp.autosave.isSuspended || wp.autosave._blockSave ) {
			return false;
		}

		// Check if its time for another autosave.
		if ( ( new Date() ).getTime() < wp.autosave.nextRun ) {
			return false;
		}

		// Get the current editor state and compute the compare string (title::excerpt::content).
		const state = getState();
		compareString = getCompareString( state );

		// Initialize lastCompareString if this is the first run and it is undefined.
		if ( typeof lastCompareString === 'undefined' ) {
			lastCompareString = compareString;
		}

		// Bail if no changes to the compare string (title::excerpt::content).
		if ( compareString === lastCompareString ) {
			return false;
		}

		// Store the latest compare string.
		lastCompareString = compareString;

		// Block autosaving for 10 seconds.
		wp.autosave.server.tempBlockSave();

		const postData = getCurrentPost( state );

		// Dispath an event to set the state isAutosaving to true..
		dispatch( toggleAutosave( true ) );

		// Add some additional data point copies expected on the back end.
		postData.post_id = postData.id;
		postData.post_type = postData.type;

		// Trigger some legacy events.
		$document.trigger( 'wpcountwords', [ postData.content ] )
			.trigger( 'before-autosave', [ postData ] );

		// Trigger a hook action.
		doAction( 'editor.beforeAutosave', postData );

		// Add the nonce to validate the request.
		postData._wpnonce = jQuery( '#_wpnonce' ).val() || '';

		return postData;
	};

	// Tie autosave button state triggers to Gutenberg autosave state.
	$document.on( 'autosave-enable-buttons', function() {
		dispatch( toggleAutosave( false ) );
	} );

	/**
	 * Disable the default (classic editor) autosave connection event handlers.
	 */
	$document.off( 'heartbeat-connection-lost.autosave' );
	$document.off( 'heartbeat-connection-restored.autosave' );
	$document.off( 'heartbeat-send.autosave' );

	/**
	 * Handle the heartbeat-send event, attaching autosave data if available.
	 */
	$document.on( 'heartbeat-send.autosave', function( event, data ) {
		const autosaveData = save();

		if ( autosaveData ) {
			data.wp_autosave = autosaveData;
		}
	} );

	/**
	 * Disable buttons and throw a notice when the connection is lost.
	 *
	 * @since 1.9.0
	 *
	 * @returns {void}
	 */
	$document.on( 'heartbeat-connection-lost.autosave', function( event, error, status ) {
		// When connection is lost, keep user from submitting changes.
		if ( 'timeout' === error || 603 === status ) {
			dispatch( showDisconnectionNotice() );
			dispatch( toggleNetworkIsConnected( false ) );
		}
	} );

	/**
	 * Enable buttons when the connection is restored.
	 *
	 * @since 1.9.0
	 *
	 * @returns {void}
	 */
	$document.on( 'heartbeat-connection-restored.autosave', function() {
		dispatch( removeNotice( DISCONNECTION_NOTICE_ID ) );
		dispatch( toggleNetworkIsConnected( true ) );
	} );
}
