import React, { Component } from 'react';
import { Modal, Form, Input, List } from 'antd';
import i18n from 'i18next';
import { divide } from 'lodash';
import { Flex } from '../../flex';
import Scrollbar from '../../common/Scrollbar';
import AnimationStepList from './AnimationStepList'
import './AnimationModal.css'

class AnimationModal extends Component {
    constructor(props) {
        super(props);
        this.state = {
            name: "",
            animationSteps: []
        }
    }
    shouldComponentUpdate(nextProps, nextState) {
        if (!this.props.visible && nextProps.visible) {
            const { animation } = nextProps;
            if (typeof animation === 'undefined') {
                this.setState({
                    name: "",
                    animationSteps: []
                });
            } else {
                this.setState({
                    name: animation.name,
                    animationSteps: [...animation.animationSteps]
                })
            }
        }
        
        return true;
    }
    onStepAdd = () => {
        const { animationSteps } = this.state;
        this.setState({
            animationSteps: [...animationSteps, {
                object: null,
                type: "HIDE",
                duration: 1
            }]
        });
    }
    onStepClear = () => {
        this.setState({ animationSteps: [] });
    }
    onStepDelete = (index) => {
        let newAnimationSteps = this.state.animationSteps;
        newAnimationSteps.splice(index, 1);
        this.setState({ animationSteps: [...newAnimationSteps] });
    }
    onObjectChange = (index, value) => {
        let newAnimationSteps = this.state.animationSteps;
        newAnimationSteps.splice(index, 1, {...newAnimationSteps[index], object: value});
        this.setState({ animationSteps: [...newAnimationSteps] });
    }
    onTypeChange = (index, value) => {
        let newAnimationSteps = this.state.animationSteps;
        newAnimationSteps.splice(index, 1, {...newAnimationSteps[index], type: value});
        this.setState({ animationSteps: [...newAnimationSteps] });
    }
    onDurationChange = (index, value) => {
        let newAnimationSteps = this.state.animationSteps;
        newAnimationSteps.splice(index, 1, {...newAnimationSteps[index], duration: value});
        this.setState({ animationSteps: [...newAnimationSteps] });
    }
	render() {
        const { visible, canvasRef } = this.props;
        const { onOk, onCancel } = this.props;
        const { animationSteps, name } = this.state;
        let objects = null;
        if (canvasRef) {
            objects = canvasRef.handler.exportJSON().filter(obj => {
                if (!obj) return false;
                if (typeof obj.object_name === 'undefined' || !obj.object_name || obj.object_name === '')
                    return false;
                return true;
            })
        }
		return (
			<Modal visible={visible} onOk={onOk(name, animationSteps)} onCancel={onCancel}>
                <Flex className="animation-modal-body" flexDirection="column">
                    <div className="name-field">
                        <span>Name: </span>
                        <Input
                            placeholder="Name"
                            style={{width: 200}}
                            value={name}
                            onChange={(e) => this.setState({ name: e.target.value })}
                        />
                    </div>
                    <div className="rde-editor-items animation-step-list">
                        <Scrollbar>
                            <AnimationStepList
                                animationSteps={animationSteps}
                                onAdd={this.onStepAdd}
                                onClear={this.onStepClear}
                                onDelete={this.onStepDelete}
                                onObjectChange={this.onObjectChange}
                                onTypeChange={this.onTypeChange}
                                onDurationChange={this.onDurationChange}
                                objects={objects}
                            />
                        </Scrollbar>
                    </div>
                </Flex>
			</Modal>
		);
	}
}

export default AnimationModal;
