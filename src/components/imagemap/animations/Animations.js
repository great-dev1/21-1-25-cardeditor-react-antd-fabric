import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Form, Button } from 'antd';
import i18n from 'i18next';

import { Flex } from '../../flex';
import AnimationList from './AnimationList';
import AnimationModal from './AnimationModal';
import Icon from '../../icon/Icon';
import Scrollbar from '../../common/Scrollbar';

const initialAnimation = {
	type: 'none',
	loop: true,
	autoplay: true,
	delay: 100,
	duration: 1000,
};

class Animations extends Component {
	static propTypes = {
		animations: PropTypes.array,
		onChangeAnimations: PropTypes.func,
	};

	static defaultProps = {
		animations: [],
	};

	state = {
		visible: false,
        curModalStatus: 'add',
        curEditNum: 0
	};

	handlers = {
		onOk: (name, animationSteps) => () => {
            if (name === '') {
                alert("Name should not be empty");
                return;
            }
            const { onChangeAnimations } = this.props;
            const { curModalStatus, curEditNum } = this.state;
            if (curModalStatus === 'add') {
                onChangeAnimations([...this.props.animations, {name, animationSteps}]);
            } else if (curModalStatus === 'edit') {
                let newAnimations = this.props.animations;
                newAnimations.splice(curEditNum, 1, { name, animationSteps });
                onChangeAnimations([...newAnimations]);
            }
            this.setState({
                visible: false
            });

		},
		onCancel: () => {
			this.setState({
				visible: false
			});
		},
		onAdd: () => {
			this.setState({
                visible: true,
                curModalStatus: 'add'
			});
		},
		onEdit: (animation, index) => {
			this.setState({
				visible: true,
                curModalStatus: 'edit',
                curEditNum: index
			});
		},
		onDelete: index => {
			this.props.animations.splice(index, 1);
			this.props.onChangeAnimations(this.props.animations);
		},
		onClear: () => {
			this.props.onChangeAnimations([]);
		},
		onChange: (props, changedValues, allValues) => {
			const fields = changedValues[Object.keys(changedValues)[0]];
			const field = Object.keys(fields)[0];
			const isTitle = field === 'title';
			if (isTitle) {
				this.setState({
					validateTitle: this.handlers.onValid(fields[field]),
				});
			}
			this.setState({
				animation: {
					title: this.state.animation.title,
					...initialAnimation,
					...allValues[Object.keys(allValues)[0]],
				},
			});
		},
		onValid: value => {
			if (!value || !value.length) {
				return {
					validateStatus: 'error',
					help: i18n.t('validation.enter-property', { arg: i18n.t('common.title') }),
				};
			}
			const exist = this.props.animations.some(animation => animation.title === value);
			if (!exist) {
				return {
					validateStatus: 'success',
					help: '',
				};
			}
			return {
				validateStatus: 'error',
				help: i18n.t('validation.already-property', { arg: i18n.t('common.title') }),
			};
		},
	};

	render() {
        const { animations, canvasRef } = this.props;
        const { visible, curModalStatus, curEditNum } = this.state;
        const { onAdd, onEdit, onDelete, onClear, onChange, onCancel, onOk } = this.handlers;
        let props = {};
        if (curModalStatus === 'edit') {
            props = { animation: animations[curEditNum] };
        }
		return (
			<Scrollbar>
				<Form>
					<Flex flexDirection="column">
						<Flex justifyContent="flex-end" style={{ padding: 8 }}>
							<Button className="rde-action-btn" shape="circle" onClick={onAdd}>
								<Icon name="plus" />
							</Button>
							<Button className="rde-action-btn" shape="circle" onClick={onClear}>
								<Icon name="times" />
							</Button>
							<AnimationModal visible={visible} canvasRef={canvasRef} onOk={onOk} onCancel={onCancel} {...props} />
						</Flex>
						<AnimationList animations={animations} onEdit={onEdit} onDelete={onDelete} />
					</Flex>
				</Form>
			</Scrollbar>
		);
	}
}

export default Animations;
