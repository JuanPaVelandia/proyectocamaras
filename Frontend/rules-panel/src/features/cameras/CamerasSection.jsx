import React, { useState } from "react";
import { CameraList } from "./CameraList";
import { AddCameraWizard } from "./AddCameraWizard";

export function CamerasSection() {
    const [view, setView] = useState("list"); // "list" | "wizard"
    const [editingCamera, setEditingCamera] = useState(null);

    const handleAdd = () => {
        setEditingCamera(null);
        setView("wizard");
    };

    const handleEdit = (camera) => {
        setEditingCamera(camera);
        setView("wizard");
    };

    const handleSuccess = () => {
        setView("list");
        setEditingCamera(null);
    };

    return (
        <div style={{
            width: "100%",
            maxWidth: "100%",
            boxSizing: "border-box",
        }}>
            {view === "list" ? (
                <CameraList
                    onAddCamera={handleAdd}
                    onEditCamera={handleEdit}
                />
            ) : (
                <AddCameraWizard
                    onCancel={() => setView("list")}
                    onSuccess={handleSuccess}
                    initialData={editingCamera}
                />
            )}
        </div>
    );
}
