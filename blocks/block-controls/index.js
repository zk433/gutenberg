/**
 * WordPress dependencies
 */
import { Toolbar, Fill } from '@wordpress/components';

/**
 * Internal dependencies
 */
import { withEditBlockContextConsumer } from '../block-edit/context';

export function BlockControls( { controls, children } ) {
	return (
		<Fill name="Block.Toolbar">
			<Toolbar controls={ controls } />
			{ children }
		</Fill>
	);
}

export default withEditBlockContextConsumer( BlockControls );
