/**
 * WordPress dependencies
 */
import {
	BlockListLayout,
	PostTitle,
	WritingFlow,
	EditorGlobalKeyboardShortcuts,
	BlockSelectionClearer,
} from '@wordpress/editor';
import { Fragment } from '@wordpress/element';
import { query } from '@wordpress/data';

/**
 * Internal dependencies
 */
import './style.scss';
import BlockInspectorButton from './block-inspector-button';

function VisualEditor( { blockUIDs, hasFixedToolbar } ) {
	return (
		<BlockSelectionClearer className="edit-post-visual-editor">
			<EditorGlobalKeyboardShortcuts />
			<WritingFlow>
				<PostTitle />
				<BlockListLayout
					layout="default"
					blockUIDs={ blockUIDs }
					showContextualToolbar={ ! hasFixedToolbar }
					renderBlockMenu={ ( { children, onClose } ) => (
						<Fragment>
							<BlockInspectorButton onClick={ onClose } />
							{ children }
						</Fragment>
					) }
				/>
			</WritingFlow>
		</BlockSelectionClearer>
	);
}

export default query( ( select ) => {
	return {
		hasFixedToolbar: select( 'core/edit-post', 'hasFixedToolbar' ),
		blockUIDs: select( 'core/editor', 'getBlockOrder' ),
	};
} )( VisualEditor );
