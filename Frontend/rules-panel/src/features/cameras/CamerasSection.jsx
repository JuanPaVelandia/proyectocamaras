import React, { useState } from "react";
import { CameraList } from "./CameraList";
import { AddCameraWizard } from "./AddCameraWizard";

export function CamerasSection() {
    const [view, setView] = useState("list"); // "list" | "wizard"

    return (
        <div style={{
            width: "100%",
            maxWidth: "100%",
            boxSizing: "border-box",
        }}>
            {view === "list" ? (
                <CameraList onAddCamera={() => setView("wizard")} />
            ) : (
                <AddCameraWizard
                    onCancel={() => setView("list")}
                    onSuccess={() => setView("list")}
                />
            )}
        </div>
    );
}
