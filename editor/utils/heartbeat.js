import store from '../store';
import {
	getEditedPostTitle,
	getEditedPostExcerpt,
	getEditedPostContent,
	getCurrentPostId,
	isPostAutosaveDirty,
} from '../store/selectors';
import {
	toggleAutosave,
	removeNotice,
	toggleNetworkIsConnected,
	showDisconnectionNotice,
	resetAutosave,
	updateAutosave,
	updateAutosaveStatusMessage,
} from '../store/actions';

import { compact } from 'lodash';

/**
 * WordPress dependencies
 */
import { doAction } from '@wordpress/hooks';

const DISCONNECTION_NOTICE_ID = 'DISCONNECTION_NOTICE_ID';

/**
 * Set up the heartbeat functionality for Gutenberg.
 */
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

		const toSend = {
			post_title: getEditedPostTitle( state ),
			post_excerpt: getEditedPostExcerpt( state ),
			content: getEditedPostContent( state ),
			post_id: getCurrentPostId( state ),
		};

		isPostAutosaveDirty( state );

		// Store the current editor values into the state autosave.
		dispatch( resetAutosave( toSend ) );

		// If the autosave is clean, no need to save.
		if ( ! isPostAutosaveDirty( state ) ) {
			return false;
		}

		// Block autosaving for 10 seconds.
		wp.autosave.server.tempBlockSave();

		// Dispath an event to set the state isAutosaving to true..
		dispatch( toggleAutosave( true ) );

		// Trigger some legacy events.
		$document.trigger( 'wpcountwords', [ toSend.content ] )
			.trigger( 'before-autosave', [ toSend ] );

		// Trigger a hook action.
		doAction( 'editor.beforeAutosave', toSend );

		dispatch( resetAutosave( toSend ) );
		toSend._wpnonce = jQuery( '#_wpnonce' ).val() || '';

		return toSend;
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
	$document.off( 'heartbeat-tick.autosave' );

	/**
	 * Handle the heartbeat tick event, possibly adding a response message to state.
	 */
	$document.on( 'heartbeat-tick.autosave', function( event, data ) {
		if ( data.wp_autosave ) {
			if ( data.wp_autosave.success ) {
				dispatch( updateAutosaveStatusMessage( data.wp_autosave.message ) );
			}
		}
	} );

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
