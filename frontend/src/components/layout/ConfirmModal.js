// frontend/src/components/ConfirmModal.js
import React from 'react';

function ConfirmModal({ message, onConfirm, onCancel }) {
    // Estilos muy básicos para simular el modal
    const modalStyle = {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    };

    const contentStyle = {
        backgroundColor: '#fff',
        padding: '30px',
        borderRadius: '8px',
        maxWidth: '400px',
        textAlign: 'center',
        boxShadow: '0 5px 15px rgba(0, 0, 0, 0.3)',
    };

    const buttonStyle = {
        padding: '10px 20px',
        margin: '0 10px',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontWeight: 'bold',
    };
    
    // Usamos los colores de tu paleta
    const confirmButtonStyle = { 
        ...buttonStyle, 
        backgroundColor: '#d9534f', // Rojo para eliminar
        color: 'white' 
    };

    const cancelButtonStyle = { 
        ...buttonStyle, 
        backgroundColor: '#f0f0f0', 
        color: '#333' 
    };


    return (
        <div style={modalStyle}>
            <div style={contentStyle}>
                <h2>Confirmación Requerida</h2>
                <p style={{ margin: '20px 0' }}>{message}</p>
                <div>
                    <button style={cancelButtonStyle} onClick={onCancel}>
                        Cancelar
                    </button>
                    <button style={confirmButtonStyle} onClick={onConfirm}>
                        Sí, Eliminar
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ConfirmModal;