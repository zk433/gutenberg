/**
 * WordPress dependencies
 */
import { Component } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button } from '@wordpress/components';
import { pick } from 'lodash';

// Getter for the sake of unit tests.
const getGalleryDetailsMediaFrame = () => {
	/**
	 * Custom gallery details frame.
	 *
	 * @link https://github.com/xwp/wp-core-media-widgets/blob/905edbccfc2a623b73a93dac803c5335519d7837/wp-admin/js/widgets/media-gallery-widget.js
	 * @class GalleryDetailsMediaFrame
	 * @constructor
	 */
	return wp.media.view.MediaFrame.Post.extend( {

		/**
		 * Create the default states.
		 *
		 * @returns {void}
		 */
		createStates: function createStates() {
			this.states.add( [
				new wp.media.controller.Library( {
					id: 'gallery',
					title: wp.media.view.l10n.createGalleryTitle,
					priority: 40,
					toolbar: 'main-gallery',
					filterable: 'uploaded',
					multiple: 'add',
					editable: false,

					library: wp.media.query( _.defaults( {
						type: 'image',
					}, this.options.library ) ),
				} ),

				new wp.media.controller.GalleryEdit( {
					library: this.options.selection,
					editing: this.options.editing,
					menu: 'gallery',
					displaySettings: false,
					multiple: true,
				} ),

				new wp.media.controller.GalleryAdd(),
			] );
		},
	} );
};

// the media library image object contains numerous attributes
// we only need this set to display the image in the library
const slimImageObject = ( img ) => {
	const attrSet = [ 'sizes', 'mime', 'type', 'subtype', 'id', 'url', 'alt', 'link' ];
	return pick( img, attrSet );
};

const getAttachmentsCollection = ( ids ) => {
	const attachments = wp.media.query( {
		order: 'ASC',
		orderby: 'post__in',
		perPage: -1,
		post__in: ids,
		query: true,
		type: 'image',
	} );

	attachments.more();
	return attachments;
};

class MediaUploadButton extends Component {
	constructor( { multiple = false, type, gallery = false } ) {
		super( ...arguments );
		this.openModal = this.openModal.bind( this );
		this.onSelect = this.onSelect.bind( this );
		this.onUpdate = this.onUpdate.bind( this );
		const frameConfig = {
			title: __( 'Select or Upload a media' ),
			button: {
				text: __( 'Select' ),
			},
			multiple,
			selection: new wp.media.model.Selection( [] ),
		};
		if ( !! type ) {
			frameConfig.library = { type };
		}

		if ( gallery ) {
			const ids = this.props.value || [];
			const attachments = getAttachmentsCollection( ids );
			const currentState = ( this.props.value ) ? 'gallery-edit' : 'gallery';
			const GalleryDetailsMediaFrame = getGalleryDetailsMediaFrame();
			this.frame = new GalleryDetailsMediaFrame( {
				mimeType: type,
				state: currentState,
				multiple,
				selection: new wp.media.model.Selection( attachments.models, {
					props: attachments.props.toJSON(),
					multiple: true,
				} ),
				editing: ( this.props.value ) ? true : false,
			} );
			wp.media.frame = this.frame;
		} else {
			this.frame = wp.media( frameConfig );
		}

		// When an image is selected in the media frame...
		this.frame.on( 'select', this.onSelect );
		this.frame.on( 'update', this.onUpdate );
	}

	componentWillUnmount() {
		this.frame.remove();
	}

	onUpdate( selections ) {
		const { onSelect, multiple = false } = this.props;
		const state = this.frame.state();
		const selectedImages = selections || state.get( 'selection' );

		if ( ! selectedImages || ! selectedImages.models.length ) {
			return;
		}
		if ( multiple ) {
			onSelect( selectedImages.models.map( ( model ) => slimImageObject( model.toJSON() ) ) );
		} else {
			onSelect( slimImageObject( selectedImages.models[ 0 ].toJSON() ) );
		}
	}

	onSelect() {
		const { onSelect, multiple = false } = this.props;
		// Get media attachment details from the frame state
		const attachment = this.frame.state().get( 'selection' ).toJSON();
		onSelect( multiple ? attachment : attachment[ 0 ] );
	}

	openModal() {
		this.frame.open();
	}

	render() {
		const { children, buttonProps } = this.props;

		return (
			<Button onClick={ this.openModal } { ...buttonProps }>
				{ children }
			</Button>
		);
	}
}

export default MediaUploadButton;
