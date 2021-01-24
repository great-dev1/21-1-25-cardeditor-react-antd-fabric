import React, { Component } from 'react';
import { Badge, Button, Popconfirm, Menu, Input } from 'antd';
import debounce from 'lodash/debounce';
import i18n from 'i18next';
import { v4 } from 'uuid';
import axios from 'axios';

import ImageMapFooterToolbar from './ImageMapFooterToolbar';
import ImageMapItems from './ImageMapItems';
import ImageMapTitle from './ImageMapTitle';
import ImageMapHeaderToolbar from './ImageMapHeaderToolbar';
import ImageMapPreview from './ImageMapPreview';
import ImageMapConfigurations from './ImageMapConfigurations';
import SandBox from '../sandbox/SandBox';

import '../../libs/fontawesome-5.2.0/css/all.css';
import '../../styles/index.less';
import Container from '../common/Container';
import CommonButton from '../common/CommonButton';
import Canvas from '../canvas/Canvas';
import PageListPanel from './PageListPanel/PageListPanel';
import { API_URL } from '../../config/env';

const propertiesToInclude = [
	'id',
	'name',
	'locked',
	'file',
	'src',
	'link',
	'tooltip',
	'animation',
	'layout',
	'workareaWidth',
	'workareaHeight',
	'videoLoadType',
	'autoplay',
	'shadow',
	'muted',
	'loop',
	'code',
	'icon',
	'userProperty',
	'trigger',
	'configuration',
	'superType',
	'points',
	'svg',
	'loadType',
];

const defaultOption = {
	fill: 'rgba(0, 0, 0, 1)',
	stroke: 'rgba(255, 255, 255, 0)',
	strokeUniform: true,
	resource: {},
	link: {
		enabled: false,
		type: 'resource',
		state: 'new',
		dashboard: {},
	},
	tooltip: {
		enabled: true,
		type: 'resource',
		template: '<div>{{message.name}}</div>',
	},
	animation: {
		type: 'none',
		loop: true,
		autoplay: true,
		duration: 1000,
	},
	userProperty: {},
	trigger: {
		enabled: false,
		type: 'alarm',
		script: 'return message.value > 0;',
		effect: 'style',
	},
};

class ImageMapEditor extends Component {
    constructor(props) {
        super(props);
        this.state = {
            selectedItem: null,
            zoomRatio: 1,
            preview: false,
            loading: false,
            progress: 0,
            animations: [],
            styles: [],
            dataSources: [],
            editing: false,
            descriptors: {},
            objects: undefined,
            canvasRefs: [{id: 0, canvasRef: null}],
            curCanvasRefId: 0,
            projectName: ""
        };
    }
	

	componentDidMount() {
		this.showLoading(true);
		import('./Descriptors.json').then(descriptors => {
			this.setState(
				{
					descriptors,
				},
				() => {
					this.showLoading(false);
				},
			);
		});
		this.setState({
			selectedItem: null,
		});
        this.shortcutHandlers.esc();
        const { projectId } = this.props;
        if (projectId) {
            this.showLoading(true);
            this.forceUpdate();
            axios.get(`${API_URL}/projects/${projectId}`)
            .then(res => {
                const { project_json, name } = res.data;
                let objectsList = null, animations = [], styles = [], dataSources = [];
                if (project_json) {
                    objectsList = project_json.objectsList;
                    animations = project_json.animations;
                    styles = project_json.styles;
                    dataSources = project_json.dataSources;
                }
                this.setState({
                    animations,
                    styles,
                    dataSources,
                    projectName: name
                });
                if (objectsList) {
                    const newCanvasRefs = objectsList.map((page, i) => {
                        const data = page.objects.filter(obj => {
                            if (!obj.id) {
                                return false;
                            }
                            return true;
                        });
                        return {id: page.id, canvasRef: null, isDuplicated: true, objects: data}
                    });
                    this.setState({canvasRefs: [...newCanvasRefs], curCanvasRefId: objectsList[0].id});
                } else {
                    const id = v4();
                    this.setState({canvasRefs: [{id, canvasRef: null}], curCanvasRefId: id})
                }
                setTimeout(() => {
                    this.showLoading(false);
                    this.forceUpdate();
                }, 500);
            })
        }
	}

	canvasHandlers = {
		onAdd: target => {
			const { editing } = this.state;
			this.forceUpdate();
			if (!editing) {
				this.changeEditing(true);
			}
			if (target.type === 'activeSelection') {
				this.canvasHandlers.onSelect(null);
				return;
			}
            this.state.canvasRefs[this.getCanvasRefById(this.state.curCanvasRefId)].canvasRef.handler.select(target);
		},
		onSelect: target => {
			const { selectedItem } = this.state;
			if (target && target.id && target.id !== 'workarea' && target.type !== 'activeSelection') {
				if (selectedItem && target.id === selectedItem.id) {
					return;
				}
				this.state.canvasRefs[this.getCanvasRefById(this.state.curCanvasRefId)].canvasRef.handler.getObjects().forEach(obj => {
					if (obj) {
						this.state.canvasRefs[this.getCanvasRefById(this.state.curCanvasRefId)].canvasRef.handler.animationHandler.resetAnimation(obj, true);
					}
				});
				this.setState({
					selectedItem: target,
                });
				return;
			}
			this.state.canvasRefs[this.getCanvasRefById(this.state.curCanvasRefId)].canvasRef.handler.getObjects().forEach(obj => {
				if (obj) {
					this.state.canvasRefs[this.getCanvasRefById(this.state.curCanvasRefId)].canvasRef.handler.animationHandler.resetAnimation(obj, true);
				}
            });
            if (target && typeof target._objects !== undefined) {
                this.setState({ selectedItem: target._objects });
                return ;
            }
			this.setState({
				selectedItem: null,
			});
		},
		onRemove: () => {
			const { editing } = this.state;
			if (!editing) {
				this.changeEditing(true);
			}
            this.canvasHandlers.onSelect(null);
		},
		onModified: debounce(() => {
			const { editing } = this.state;
			this.forceUpdate();
			if (!editing) {
				this.changeEditing(true);
			}
		}, 300),
		onZoom: zoom => {
			this.setState({
				zoomRatio: zoom,
			});
		},
		onChange: (selectedItem, changedValues, allValues) => {
			const { editing } = this.state;
			if (!editing) {
				this.changeEditing(true);
			}
			const changedKey = Object.keys(changedValues)[0];
			const changedValue = changedValues[changedKey];
			if (allValues.workarea) {
				this.canvasHandlers.onChangeWokarea(changedKey, changedValue, allValues.workarea);
				return;
			}
			if (changedKey === 'width' || changedKey === 'height') {
				this.state.canvasRefs[this.getCanvasRefById(this.state.curCanvasRefId)].canvasRef.handler.scaleToResize(allValues.width, allValues.height);
				return;
			}
			if (changedKey === 'angle') {
				this.state.canvasRefs[this.getCanvasRefById(this.state.curCanvasRefId)].canvasRef.handler.rotate(allValues.angle);
				return;
			}
			if (changedKey === 'locked') {
				this.state.canvasRefs[this.getCanvasRefById(this.state.curCanvasRefId)].canvasRef.handler.setObject({
					lockMovementX: changedValue,
					lockMovementY: changedValue,
					hasControls: !changedValue,
					hoverCursor: changedValue ? 'pointer' : 'move',
					editable: !changedValue,
					locked: changedValue,
				});
				return;
			}
			if (changedKey === 'file' || changedKey === 'src' || changedKey === 'code') {
				if (selectedItem.type === 'image') {
					this.state.canvasRefs[this.getCanvasRefById(this.state.curCanvasRefId)].canvasRef.handler.setImageById(selectedItem.id, changedValue);
				} else if (selectedItem.superType === 'element') {
					this.state.canvasRefs[this.getCanvasRefById(this.state.curCanvasRefId)].canvasRef.handler.elementHandler.setById(selectedItem.id, changedValue);
				}
				return;
			}
			if (changedKey === 'link') {
				const link = Object.assign({}, defaultOption.link, allValues.link);
				this.state.canvasRefs[this.getCanvasRefById(this.state.curCanvasRefId)].canvasRef.handler.set(changedKey, link);
				return;
			}
			if (changedKey === 'tooltip') {
				const tooltip = Object.assign({}, defaultOption.tooltip, allValues.tooltip);
				this.state.canvasRefs[this.getCanvasRefById(this.state.curCanvasRefId)].canvasRef.handler.set(changedKey, tooltip);
				return;
			}
			if (changedKey === 'animation') {
				const animation = Object.assign({}, defaultOption.animation, allValues.animation);
				this.state.canvasRefs[this.getCanvasRefById(this.state.curCanvasRefId)].canvasRef.handler.set(changedKey, animation);
				return;
			}
			if (changedKey === 'icon') {
				const { unicode, styles } = changedValue[Object.keys(changedValue)[0]];
				const uni = parseInt(unicode, 16);
				if (styles[0] === 'brands') {
					this.state.canvasRefs[this.getCanvasRefById(this.state.curCanvasRefId)].canvasRef.handler.set('fontFamily', 'Font Awesome 5 Brands');
				} else if (styles[0] === 'regular') {
					this.state.canvasRefs[this.getCanvasRefById(this.state.curCanvasRefId)].canvasRef.handler.set('fontFamily', 'Font Awesome 5 Regular');
				} else {
					this.state.canvasRefs[this.getCanvasRefById(this.state.curCanvasRefId)].canvasRef.handler.set('fontFamily', 'Font Awesome 5 Free');
				}
				this.state.canvasRefs[this.getCanvasRefById(this.state.curCanvasRefId)].canvasRef.handler.set('text', String.fromCodePoint(uni));
				this.state.canvasRefs[this.getCanvasRefById(this.state.curCanvasRefId)].canvasRef.handler.set('icon', changedValue);
				return;
			}
			if (changedKey === 'shadow') {
				if (allValues.shadow.enabled) {
					if ('blur' in allValues.shadow) {
						this.state.canvasRefs[this.getCanvasRefById(this.state.curCanvasRefId)].canvasRef.handler.setShadow(allValues.shadow);
					} else {
						this.state.canvasRefs[this.getCanvasRefById(this.state.curCanvasRefId)].canvasRef.handler.setShadow({
							enabled: true,
							blur: 15,
							offsetX: 10,
							offsetY: 10,
						});
					}
				} else {
					this.state.canvasRefs[this.getCanvasRefById(this.state.curCanvasRefId)].canvasRef.handler.setShadow(null);
				}
				return;
			}
			if (changedKey === 'fontWeight') {
				this.state.canvasRefs[this.getCanvasRefById(this.state.curCanvasRefId)].canvasRef.handler.set(changedKey, changedValue ? 'bold' : 'normal');
				return;
			}
			if (changedKey === 'fontStyle') {
				this.state.canvasRefs[this.getCanvasRefById(this.state.curCanvasRefId)].canvasRef.handler.set(changedKey, changedValue ? 'italic' : 'normal');
				return;
			}
			if (changedKey === 'textAlign') {
				this.state.canvasRefs[this.getCanvasRefById(this.state.curCanvasRefId)].canvasRef.handler.set(changedKey, Object.keys(changedValue)[0]);
				return;
			}
			if (changedKey === 'trigger') {
				const trigger = Object.assign({}, defaultOption.trigger, allValues.trigger);
				this.state.canvasRefs[this.getCanvasRefById(this.state.curCanvasRefId)].canvasRef.handler.set(changedKey, trigger);
				return;
			}
			if (changedKey === 'filters') {
				const filterKey = Object.keys(changedValue)[0];
				const filterValue = allValues.filters[filterKey];
				if (filterKey === 'gamma') {
					const rgb = [filterValue.r, filterValue.g, filterValue.b];
					this.state.canvasRefs[this.getCanvasRefById(this.state.curCanvasRefId)].canvasRef.handler.imageHandler.applyFilterByType(filterKey, changedValue[filterKey].enabled, {
						gamma: rgb,
					});
					return;
				}
				if (filterKey === 'brightness') {
					this.state.canvasRefs[this.getCanvasRefById(this.state.curCanvasRefId)].canvasRef.handler.imageHandler.applyFilterByType(filterKey, changedValue[filterKey].enabled, {
						brightness: filterValue.brightness,
					});
					return;
				}
				if (filterKey === 'contrast') {
					this.state.canvasRefs[this.getCanvasRefById(this.state.curCanvasRefId)].canvasRef.handler.imageHandler.applyFilterByType(filterKey, changedValue[filterKey].enabled, {
						contrast: filterValue.contrast,
					});
					return;
				}
				if (filterKey === 'saturation') {
					this.state.canvasRefs[this.getCanvasRefById(this.state.curCanvasRefId)].canvasRef.handler.imageHandler.applyFilterByType(filterKey, changedValue[filterKey].enabled, {
						saturation: filterValue.saturation,
					});
					return;
				}
				if (filterKey === 'hue') {
					this.state.canvasRefs[this.getCanvasRefById(this.state.curCanvasRefId)].canvasRef.handler.imageHandler.applyFilterByType(filterKey, changedValue[filterKey].enabled, {
						rotation: filterValue.rotation,
					});
					return;
				}
				if (filterKey === 'noise') {
					this.state.canvasRefs[this.getCanvasRefById(this.state.curCanvasRefId)].canvasRef.handler.imageHandler.applyFilterByType(filterKey, changedValue[filterKey].enabled, {
						noise: filterValue.noise,
					});
					return;
				}
				if (filterKey === 'pixelate') {
					this.state.canvasRefs[this.getCanvasRefById(this.state.curCanvasRefId)].canvasRef.handler.imageHandler.applyFilterByType(filterKey, changedValue[filterKey].enabled, {
						blocksize: filterValue.blocksize,
					});
					return;
				}
				if (filterKey === 'blur') {
					this.state.canvasRefs[this.getCanvasRefById(this.state.curCanvasRefId)].canvasRef.handler.imageHandler.applyFilterByType(filterKey, changedValue[filterKey].enabled, {
						value: filterValue.value,
					});
					return;
				}
				this.state.canvasRefs[this.getCanvasRefById(this.state.curCanvasRefId)].canvasRef.handler.imageHandler.applyFilterByType(filterKey, changedValue[filterKey]);
				return;
			}
			if (changedKey === 'chartOption') {
				try {
					const sandbox = new SandBox();
					const compiled = sandbox.compile(changedValue);
					const { animations, styles } = this.state;
					const chartOption = compiled(3, animations, styles, selectedItem.userProperty);
					selectedItem.setChartOptionStr(changedValue);
					this.state.canvasRefs[this.getCanvasRefById(this.state.curCanvasRefId)].canvasRef.handler.elementHandler.setById(selectedItem.id, chartOption);
				} catch (error) {
					console.error(error);
				}
				return;
			}
			this.state.canvasRefs[this.getCanvasRefById(this.state.curCanvasRefId)].canvasRef.handler.set(changedKey, changedValue);
		},
		onChangeWokarea: (changedKey, changedValue, allValues) => {
			if (changedKey === 'layout') {
				this.state.canvasRefs[this.getCanvasRefById(this.state.curCanvasRefId)].canvasRef.handler.workareaHandler.setLayout(changedValue);
				return;
			}
			if (changedKey === 'file' || changedKey === 'src') {
				this.state.canvasRefs[this.getCanvasRefById(this.state.curCanvasRefId)].canvasRef.handler.workareaHandler.setImage(changedValue);
				return;
			}
			if (changedKey === 'width' || changedKey === 'height') {
				this.state.canvasRefs[this.getCanvasRefById(this.state.curCanvasRefId)].canvasRef.handler.originScaleToResize(
					this.state.canvasRefs[this.getCanvasRefById(this.state.curCanvasRefId)].canvasRef.handler.workarea,
					allValues.width,
					allValues.height,
				);
				this.state.canvasRefs[this.getCanvasRefById(this.state.curCanvasRefId)].canvasRef.canvas.centerObject(this.state.canvasRefs[this.getCanvasRefById(this.state.curCanvasRefId)].canvasRef.handler.workarea);
				return;
			}
			this.state.canvasRefs[this.getCanvasRefById(this.state.curCanvasRefId)].canvasRef.handler.workarea.set(changedKey, changedValue);
			this.state.canvasRefs[this.getCanvasRefById(this.state.curCanvasRefId)].canvasRef.canvas.requestRenderAll();
		},
		onTooltip: (ref, target) => {
			const value = Math.random() * 10 + 1;
			const { animations, styles } = this.state;
			// const { code } = target.trigger;
			// const compile = SandBox.compile(code);
			// const result = compile(value, animations, styles, target.userProperty);
			// console.log(result);
			return (
				<div>
					<div>
						<div>
							<Button>{target.id}</Button>
						</div>
						<Badge count={value} />
					</div>
				</div>
			);
		},
		onClick: (canvas, target) => {
			const { link } = target;
			if (link.state === 'current') {
				document.location.href = link.url;
				return;
			}
			window.open(link.url);
		},
		onContext: (ref, event, target) => {
			if ((target && target.id === 'workarea') || !target) {
				const { layerX: left, layerY: top } = event;
				return (
					<Menu>
						<Menu.SubMenu key="add" style={{ width: 120 }} title={i18n.t('action.add')}>
							{this.transformList().map(item => {
								const option = Object.assign({}, item.option, { left, top });
								const newItem = Object.assign({}, item, { option });
								return (
									<Menu.Item style={{ padding: 0 }} key={item.name}>
										{this.itemsRef.renderItem(newItem, false)}
									</Menu.Item>
								);
							})}
						</Menu.SubMenu>
					</Menu>
				);
			}
			if (target.type === 'activeSelection') {
				return (
					<Menu>
						<Menu.Item
							onClick={() => {
								this.state.canvasRefs[this.getCanvasRefById(this.state.curCanvasRefId)].canvasRef.handler.toGroup();
							}}
						>
							{i18n.t('action.object-group')}
						</Menu.Item>
						<Menu.Item
							onClick={() => {
								this.state.canvasRefs[this.getCanvasRefById(this.state.curCanvasRefId)].canvasRef.handler.duplicate();
							}}
						>
							{i18n.t('action.clone')}
						</Menu.Item>
						<Menu.Item
							onClick={() => {
								this.state.canvasRefs[this.getCanvasRefById(this.state.curCanvasRefId)].canvasRef.handler.remove();
							}}
						>
							{i18n.t('action.delete')}
						</Menu.Item>
					</Menu>
				);
			}
			if (target.type === 'group') {
				return (
					<Menu>
						<Menu.Item
							onClick={() => {
								this.state.canvasRefs[this.getCanvasRefById(this.state.curCanvasRefId)].canvasRef.handler.toActiveSelection();
							}}
						>
							{i18n.t('action.object-ungroup')}
						</Menu.Item>
						<Menu.Item
							onClick={() => {
								this.state.canvasRefs[this.getCanvasRefById(this.state.curCanvasRefId)].canvasRef.handler.duplicate();
							}}
						>
							{i18n.t('action.clone')}
						</Menu.Item>
						<Menu.Item
							onClick={() => {
								this.state.canvasRefs[this.getCanvasRefById(this.state.curCanvasRefId)].canvasRef.handler.remove();
							}}
						>
							{i18n.t('action.delete')}
						</Menu.Item>
					</Menu>
				);
			}
			return (
				<Menu>
					<Menu.Item
						onClick={() => {
							this.state.canvasRefs[this.getCanvasRefById(this.state.curCanvasRefId)].canvasRef.handler.duplicateById(target.id);
						}}
					>
						{i18n.t('action.clone')}
					</Menu.Item>
					<Menu.Item
						onClick={() => {
							this.state.canvasRefs[this.getCanvasRefById(this.state.curCanvasRefId)].canvasRef.handler.removeById(target.id);
						}}
					>
						{i18n.t('action.delete')}
					</Menu.Item>
				</Menu>
			);
		},
		onTransaction: transaction => {
			this.forceUpdate();
		},
	};

	handlers = {
		onChangePreview: checked => {
			let data;
			if (this.state.canvasRefs[this.getCanvasRefById(this.state.curCanvasRefId)].canvasRef) {
				data = this.state.canvasRefs[this.getCanvasRefById(this.state.curCanvasRefId)].canvasRef.handler.exportJSON().filter(obj => {
					if (!obj.id) {
						return false;
					}
					return true;
				});
			}
			this.setState({
				preview: typeof checked === 'object' ? false : checked,
				objects: data,
			});
		},
		onProgress: progress => {
			this.setState({
				progress,
			});
		},
		onImport: files => {
			if (files) {
				this.showLoading(true);
				setTimeout(() => {
					const reader = new FileReader();
					reader.onprogress = e => {
						if (e.lengthComputable) {
							const progress = parseInt((e.loaded / e.total) * 100, 10);
							this.handlers.onProgress(progress);
						}
					};
					reader.onload = e => {
                        const { objectsList, animations, styles, dataSources } = JSON.parse(e.target.result);
						this.setState({
							animations,
							styles,
							dataSources
						});
						if (objectsList) {
							const newCanvasRefs = objectsList.map((page, i) => {
								const data = page.objects.filter(obj => {
									if (!obj.id) {
										return false;
									}
									return true;
								});
								return {id: page.id, canvasRef: null, isDuplicated: true, objects: data}
							});
							this.setState({canvasRefs: [...newCanvasRefs], curCanvasRefId: objectsList[0].id});
						}
						setTimeout(() => {
							this.forceUpdate();
						}, 500);
					};
					reader.onloadend = () => {
						this.showLoading(false);
					};
					reader.onerror = () => {
						this.showLoading(false);
					};
					reader.readAsText(files[0]);
				}, 500);
			}
		},
		onUpload: () => {
			const inputEl = document.createElement('input');
			inputEl.accept = '.json';
			inputEl.type = 'file';
			inputEl.hidden = true;
			inputEl.onchange = e => {
				this.handlers.onImport(e.target.files);
			};
			document.body.appendChild(inputEl); // required for firefox
			inputEl.click();
			inputEl.remove();
		},
		onDownload: () => {
			this.showLoading(true);
			const { canvasRefs } = this.state;
			const objectsList = canvasRefs.map(canvasRef => {
				const objects = canvasRef.canvasRef.handler.exportJSON().filter(obj => {
					if (!obj.id) {
						return false;
					}
					return true;
				});
				return {id: canvasRef.id, objects};
			})
			const { animations, styles, dataSources } = this.state;
			const exportDatas = {
				objectsList,
				animations,
				styles,
				dataSources,
            };
			const anchorEl = document.createElement('a');
			anchorEl.href = `data:text/json;charset=utf-8,${encodeURIComponent(
				JSON.stringify(exportDatas, null, '\t'),
			)}`;
			anchorEl.download = `${this.state.canvasRefs[this.getCanvasRefById(this.state.curCanvasRefId)].canvasRef.handler.workarea.name || 'sample'}.json`;
			document.body.appendChild(anchorEl); // required for firefox
			anchorEl.click();
			anchorEl.remove();
			this.showLoading(false);
		},
		onChangeAnimations: animations => {
			if (!this.state.editing) {
				this.changeEditing(true);
			}
			this.setState({
				animations,
			});
		},
		onChangeStyles: styles => {
			if (!this.state.editing) {
				this.changeEditing(true);
			}
			this.setState({
				styles,
			});
		},
		onChangeDataSources: dataSources => {
			if (!this.state.editing) {
				this.changeEditing(true);
			}
			this.setState({
				dataSources,
			});
		},
		onSaveImage: () => {
			this.state.canvasRefs[this.getCanvasRefById(this.state.curCanvasRefId)].canvasRef.handler.saveCanvasImage();
        },
        onSaveProject: () => {
            this.showLoading(true);
			const { canvasRefs } = this.state;
			const objectsList = canvasRefs.map(canvasRef => {
				const objects = canvasRef.canvasRef.handler.exportJSON().filter(obj => {
					if (!obj.id) {
						return false;
					}
					return true;
				});
				return {id: canvasRef.id, objects};
			})
			const { animations, styles, dataSources, curCanvasRefId } = this.state;
			const exportDatas = {
				objectsList,
				animations,
				styles,
				dataSources,
            };
            const { projectId } = this.props;
            if (!projectId) {
                this.showLoading(false);
                return;
            }
            axios.put(`${API_URL}/projects/${projectId}`, {
                name: this.state.projectName,
                project_json: exportDatas
            })
            .then(() => {
                const { onProjectNameChange } = this.props;
                onProjectNameChange(this.state.projectName);
                this.showLoading(false);
                alert("Save project successfully");
            })
            
        }
	};

	shortcutHandlers = {
		esc: () => {
			document.addEventListener('keydown', e => {
				if (e.keyCode === 27) {
					this.handlers.onChangePreview(false);
				}
			});
		},
	};

	transformList = () => {
		return Object.values(this.state.descriptors).reduce((prev, curr) => prev.concat(curr), []);
	};

	showLoading = loading => {
		this.setState({
			loading,
		});
	};

	changeEditing = editing => {
		this.setState({
			editing,
		});
	};
    
    onPanelStateChange = (type, value) => {
        if (type === 'init') {
			const id = v4();
            this.setState({canvasRefs: [{id, canvasRef: null}], curCanvasRefId: id});
        } else if (type === 'page-change') {
            this.setState({curCanvasRefId: value});
        } else if (type === 'add') {
			const id = v4();
            const { canvasRefs } = this.state;
            this.setState({canvasRefs: [...canvasRefs, {id, canvasRef: null}]})
        } else if (type === 'delete') {
			const id = value;
			const { canvasRefs, curCanvasRefId } = this.state;
            this.setState({canvasRefs: canvasRefs.filter((canvasRef, i) => {
				if (canvasRef.id !== id) return true;
				if (id === curCanvasRefId) {
					if (i === (canvasRefs.length - 1)) {
						this.setState({curCanvasRefId: canvasRefs[i - 1].id});
					} else {
						this.setState({curCanvasRefId: canvasRefs[i + 1].id});
					}
				}
				return false; 
			})});
        } else if (type === 'duplicate') {
			const { canvasRefs } = this.state;
			let newCanvasRefs = [];
			for (let i = 0; i < canvasRefs.length; i++) {
				const e = canvasRefs[i];
				newCanvasRefs.push(e);
				if (value === e.id) {
					const id = v4();
					const objects = e.canvasRef.handler.exportJSON().filter(obj => {
						if (!obj.id) {
							return false;
						}
						return true;
					});
					newCanvasRefs.push({id, canvasRef: e.canvasRef, isDuplicated: true, objects});
				}
			}
			this.setState({canvasRefs: [...newCanvasRefs]});
		}
		setTimeout(() => {
			this.forceUpdate();
		}, 300);
    }

    getCanvasRefById = (id) => {
        const { canvasRefs } = this.state;
        let res = 0;
        for (let i = 0; i < canvasRefs.length; i++) {
            const e = canvasRefs[i];
            if (e.id === id) {
                res = i;
                break;
            }
        }
        return res;
    }

    getPreviewImgById = (id) => {
        const { canvasRefs } = this.state;
        let res = null;
        for (let i = 0; i < canvasRefs.length; i++) {
            const e = canvasRefs[i];
            if (e.id === id) {
                res = e.canvasRef ? e.canvasRef.canvas.toDataURL("image/png") : null;
				break;
            }
        }
        return res;
    }

	render() {
		const {
			preview,
			selectedItem,
			zoomRatio,
			loading,
			progress,
			animations,
			styles,
			dataSources,
			editing,
			descriptors,
            objects,
            curCanvasRefId
        } = this.state;
		let { canvasRefs } = this.state;
		const {
			onAdd,
			onRemove,
			onSelect,
			onModified,
			onChange,
			onZoom,
			onTooltip,
			onClick,
			onContext,
			onTransaction,
		} = this.canvasHandlers;
		const {
			onChangePreview,
			onDownload,
			onUpload,
			onChangeAnimations,
			onChangeStyles,
			onChangeDataSources,
            onSaveImage,
            onSaveProject
        } = this.handlers;
		const action = (
			<React.Fragment>
                <CommonButton
					className="rde-action-btn"
					shape="circle"
                    icon="save"
                    disabled={!this.props.projectId}
					tooltipTitle={i18n.t('action.save')}
					onClick={onSaveProject}
					tooltipPlacement="bottomRight"
				/>
				<CommonButton
					className="rde-action-btn"
					shape="circle"
					icon="file-download"
					disabled={!editing}
					tooltipTitle={i18n.t('action.download')}
					onClick={onDownload}
					tooltipPlacement="bottomRight"
				/>
				{editing ? (
					<Popconfirm
						title={i18n.t('imagemap.imagemap-editing-confirm')}
						okText={i18n.t('action.ok')}
						cancelText={i18n.t('action.cancel')}
						onConfirm={onUpload}
						placement="bottomRight"
					>
						<CommonButton
							className="rde-action-btn"
							shape="circle"
							icon="file-upload"
							tooltipTitle={i18n.t('action.upload')}
							tooltipPlacement="bottomRight"
						/>
					</Popconfirm>
				) : (
					<CommonButton
						className="rde-action-btn"
						shape="circle"
						icon="file-upload"
						tooltipTitle={i18n.t('action.upload')}
						tooltipPlacement="bottomRight"
						onClick={onUpload}
					/>
				)}
				<CommonButton
					className="rde-action-btn"
					shape="circle"
					icon="image"
					tooltipTitle={i18n.t('action.image-save')}
					onClick={onSaveImage}
					tooltipPlacement="bottomRight"
				/>
			</React.Fragment>
		);
		const titleContent = (
			<React.Fragment>
                <Input style={{width: 300}} placeholder="Project Name" value={this.state.projectName} onChange={(e) => this.setState({projectName: e.target.value})}/>
			</React.Fragment>
		);
		const title = <ImageMapTitle title={titleContent} action={action} />;
		const content = (
			<div className="rde-editor">
				<ImageMapItems
					ref={c => {
						this.itemsRef = c;
					}}
					canvasRef={this.state.canvasRefs[this.getCanvasRefById(this.state.curCanvasRefId)].canvasRef}
					descriptors={descriptors}
				/>
                <PageListPanel
					onPanelStateChange={this.onPanelStateChange}
					getPreviewImgById={this.getPreviewImgById}
					pages={canvasRefs}
					curPageId={curCanvasRefId}
				/>
				<div className="rde-editor-canvas-container">
					<div className="rde-editor-header-toolbar">
						<ImageMapHeaderToolbar
							canvasRef={this.state.canvasRefs[this.getCanvasRefById(this.state.curCanvasRefId)].canvasRef}
							selectedItem={selectedItem}
							onSelect={onSelect}
						/>
					</div>
					<div
						ref={c => {
							this.container = c;
						}}
						className="rde-editor-canvas"
					>
                    {
                        canvasRefs.map(canvasRef => {
						const { isDuplicated, objects } = canvasRef;
						let props = {};
						if(isDuplicated) {
							props.onLoad = handler => handler.importJSON(objects)
						}
						return <Canvas
							ref={c => {
								canvasRef.canvasRef = c;
							}}
							key={canvasRef.id}
                            className="rde-canvas"
                            style={canvasRef.id === curCanvasRefId ? {zIndex: 0} : {zIndex: -1}}
							minZoom={30}
							maxZoom={500}
							objectOption={defaultOption}
							propertiesToInclude={propertiesToInclude}
							onModified={onModified}
							onAdd={onAdd}
							onRemove={onRemove}
							onSelect={onSelect}
							onZoom={onZoom}
							onTooltip={onTooltip}
							onClick={onClick}
							onContext={onContext}
							onTransaction={onTransaction}
							keyEvent={{
								transaction: true,
							}}
							{...props}
						/>})
                    }
					</div>
					<div className="rde-editor-footer-toolbar">
						<ImageMapFooterToolbar
							canvasRef={this.state.canvasRefs[this.getCanvasRefById(this.state.curCanvasRefId)].canvasRef}
							preview={preview}
							onChangePreview={onChangePreview}
							zoomRatio={zoomRatio}
						/>
					</div>
				</div>
				<ImageMapConfigurations
					canvasRef={this.state.canvasRefs[this.getCanvasRefById(this.state.curCanvasRefId)].canvasRef}
					onChange={onChange}
					selectedItem={selectedItem}
					onChangeAnimations={onChangeAnimations}
					onChangeStyles={onChangeStyles}
					onChangeDataSources={onChangeDataSources}
					animations={animations}
					styles={styles}
					dataSources={dataSources}
				/>
				<ImageMapPreview
					preview={preview}
					onChangePreview={onChangePreview}
					onTooltip={onTooltip}
					onClick={onClick}
					objects={objects}
				/>
			</div>
		);
		return <Container title={title} content={content} loading={loading} className="" />;
	}
}

export default ImageMapEditor;
