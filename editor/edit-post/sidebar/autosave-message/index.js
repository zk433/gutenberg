/**
 * Internal dependencies
 */
import { getAutosaveMessage } from '../../../store/selectors';

function AutosaveMessage( { message } ) {
	return (
		<span>{ message }</span>
	);
}

export default connect(
	( state ) => {
		return {
			message: getAutosaveMessage( state ),
		};
	}
)( AutosaveMessage );
