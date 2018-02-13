/**
 * External dependencies
 */
import { createContext } from '@wordpress/element';

const EditBlockContext = createContext( {
	isSelected: true,
} );

export const withEditBlockContextProvider = ( OriginalComponent ) =>
	( props ) => (
		<EditBlockContext.Provider value={ { isSelected: props.isSelected } }>
			<OriginalComponent { ...props } />
		</EditBlockContext.Provider>
	);

export const withEditBlockContextConsumer = ( OriginalComponent ) =>
	( props ) => (
		<EditBlockContext.Consumer>
			{ ( { isSelected } ) => isSelected && (
				<OriginalComponent { ...props } />
			) }
		</EditBlockContext.Consumer>
	);
