import { forwardRef, useImperativeHandle, useRef } from 'react';
import { View } from 'react-native';
import SignatureScreen, { type SignatureViewRef } from 'react-native-signature-canvas';

export interface SignaturePadHandle {
  /** Asks the pad for its content; results arrive via onSignature/onEmpty. */
  read: () => void;
  clear: () => void;
}

export interface SignaturePadProps {
  onSignature: (pngDataUrl: string) => void;
  onEmpty?: () => void;
}

const WEB_STYLE = `
  .m-signature-pad { box-shadow: none; border: none; height: 100%; margin: 0; }
  .m-signature-pad--body { border: none; }
  .m-signature-pad--footer { display: none; }
  body, html { width: 100%; height: 100%; margin: 0; }
`;

export const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(
  function SignaturePad({ onSignature, onEmpty }, ref) {
    const padRef = useRef<SignatureViewRef>(null);

    useImperativeHandle(ref, () => ({
      read: () => padRef.current?.readSignature(),
      clear: () => padRef.current?.clearSignature(),
    }));

    return (
      <View className="flex-1 overflow-hidden border border-gray-300 bg-white">
        <SignatureScreen
          ref={padRef}
          onOK={onSignature}
          onEmpty={onEmpty}
          webStyle={WEB_STYLE}
          descriptionText=""
          backgroundColor="#ffffff"
          penColor="#111827"
        />
      </View>
    );
  },
);
