import React, { useRef } from "react";

const AddMedia = ({ setMediaPreview, setMedia }) => {
	const fileInputRef = useRef(null);

	// add media
	const addMedia = (e) => {
		// remove old data
		setMediaPreview(null);
		setMedia(null);

		setTimeout(() => {
			if (!validate(e)) {
				setMediaPreview(null);
				setMedia(null);
				return;
			}

			const file = e?.target?.files?.[0];
			const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB limit

			if (file.size > MAX_FILE_SIZE) {
				alert("File size exceeds 20MB limit");
				setMedia(null);
				setMediaPreview(null);
				return;
			}
			setMedia(file);
			const reader = new FileReader();
			reader.onload = (e) => {
				if (reader?.readyState === 2) {
					setMediaPreview(reader?.result);
				}
			};

			if (file?.type?.startsWith("image/")) {
				reader?.readAsDataURL(file);
			} else if (file?.type?.startsWith("video/")) {
				setMediaPreview(URL?.createObjectURL(file));
			} else if (file?.type?.startsWith("audio/")) {
				setMediaPreview(URL?.createObjectURL(file));
			} else {
				setMediaPreview(null);
			}

			fileInputRef.current.value = "";
		}, 100);
	};

	// validate media
	const validate = (e) => {
		return !!e?.target?.files?.[0];
	};

	return (
		<input
			ref={fileInputRef}
			className="absolute top-0 left-0 h-full w-full opacity-0"
			role="button"
			type="file"
			onChange={addMedia}
			accept="image/*,video/*,audio/*"
		/>
	);
};

export default AddMedia;
