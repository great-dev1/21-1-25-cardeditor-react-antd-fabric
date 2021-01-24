import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Collapse, notification, Input, message } from 'antd';
import { v4 } from 'uuid';
import classnames from 'classnames';
import i18n from 'i18next';
import AWS from 'aws-sdk'
import axios from 'axios';

import { Flex } from '../flex';
import Icon from '../icon/Icon';
import Scrollbar from '../common/Scrollbar';
import CommonButton from '../common/CommonButton';
import { SVGModal } from '../common';
import {FileLibraryListItem, ReactMediaLibrary, FileMeta} from 'react-media-library';
import { s3 } from './config/aws';
import { API_URL } from '../../config/env';

notification.config({
	top: 80,
	duration: 2,
});

const getThumbnailUrl = (s3, image) => {
    return `http://s3-${s3.region}.amazonaws.com/${s3.bucketName}/${image}`;
}
class ImageMapItems extends Component {
    constructor(props) {
        super(props);
        AWS.config.update({
            accessKeyId: s3.accessKeyId,
            secretAccessKey: s3.secretAccessKey
        });
        this.myBucket = new AWS.S3({
            params: { Bucket: s3.bucketName},
            region: s3.region,
        });
        this.state = {
            activeKey: [],
            collapse: false,
            textSearch: '',
            descriptors: {},
            filteredDescriptors: [],
            svgModalVisible: false,
            rmlDisplay: false,
            fileLibraryList: [],
            imageItem: null,
            centered: null
        };
    }
	static propTypes = {
		canvasRef: PropTypes.any,
		descriptors: PropTypes.object,
	};
	componentDidMount() {
		const { canvasRef } = this.props;
        this.waitForCanvasRender(canvasRef);
	}

	UNSAFE_componentWillReceiveProps(nextProps) {
		if (JSON.stringify(this.props.descriptors) !== JSON.stringify(nextProps.descriptors)) {
			const descriptors = Object.keys(nextProps.descriptors).reduce((prev, key) => {
				return prev.concat(nextProps.descriptors[key]);
			}, []);
			this.setState({
				descriptors,
			});
		}
	}

	shouldComponentUpdate(nextProps, nextState) {
		if (JSON.stringify(this.state.descriptors) !== JSON.stringify(nextState.descriptors)) {
			return true;
		} else if (JSON.stringify(this.state.filteredDescriptors) !== JSON.stringify(nextState.filteredDescriptors)) {
			return true;
		} else if (this.state.textSearch !== nextState.textSearch) {
			return true;
		} else if (JSON.stringify(this.state.activeKey) !== JSON.stringify(nextState.activeKey)) {
			return true;
		} else if (this.state.collapse !== nextState.collapse) {
			return true;
		} else if (this.state.svgModalVisible !== nextState.svgModalVisible) {
			return true;
		} else if (this.props.canvasRef !== nextProps.canvasRef) {
            const { canvasRef } = this.props;
            this.detachEventListener(canvasRef);
            this.attachEventListener(nextProps.canvasRef);
        }
		return false;
	}

	componentWillUnmount() {
		const { canvasRef } = this.props;
		this.detachEventListener(canvasRef);
	}

	waitForCanvasRender = canvas => {
		setTimeout(() => {
			if (canvas) {
				this.attachEventListener(canvas);
				return;
			}
			const { canvasRef } = this.props;
			this.waitForCanvasRender(canvasRef);
		}, 5);
	};

	attachEventListener = canvas => {
		if (!canvas) return;
		canvas.canvas.wrapperEl.addEventListener('dragenter', this.events.onDragEnter, false);
		canvas.canvas.wrapperEl.addEventListener('dragover', this.events.onDragOver, false);
		canvas.canvas.wrapperEl.addEventListener('dragleave', this.events.onDragLeave, false);
		canvas.canvas.wrapperEl.addEventListener('drop', this.events.onDrop, false);
	};

	detachEventListener = canvas => {
		if (!canvas) return;
		canvas.canvas.wrapperEl.removeEventListener('dragenter', this.events.onDragEnter);
		canvas.canvas.wrapperEl.removeEventListener('dragover', this.events.onDragOver);
		canvas.canvas.wrapperEl.removeEventListener('dragleave', this.events.onDragLeave);
		canvas.canvas.wrapperEl.removeEventListener('drop', this.events.onDrop);
	};

	/* eslint-disable react/sort-comp, react/prop-types */
	handlers = {
		onAddItem: (item, centered) => {
			const { canvasRef } = this.props;
			if (canvasRef.handler.interactionMode === 'polygon') {
				message.info('Already drawing');
				return;
			}
			const id = v4();
			const option = Object.assign({}, item.option, { id });
			if (item.option.superType === 'svg' && item.type === 'default') {
				this.handlers.onSVGModalVisible(item.option);
				return;
            }
            if (item.type === 'image') {
                this.getAllImages();
                this.setState({rmlDisplay: true, imageItem: item, centered});
            } else {
                canvasRef.handler.add(option, centered);
            }
            this.forceUpdate();
		},
		onAddSVG: (option, centered) => {
			const { canvasRef } = this.props;
			canvasRef.handler.add({ ...option, type: 'svg', superType: 'svg', id: v4(), name: 'New SVG' }, centered);
			this.handlers.onSVGModalVisible();
		},
		onDrawingItem: item => {
			const { canvasRef } = this.props;
			if (canvasRef.handler.interactionMode === 'polygon' || canvasRef.handler.interactionMode === 'photspot') {
				message.info('Already drawing');
				return;
			}
			if (item.option.type === 'line') {
				canvasRef.handler.drawingHandler.line.init();
			} else if (item.option.type === 'arrow') {
				canvasRef.handler.drawingHandler.arrow.init();
            } else if (item.option.type === 'photspot') {
                canvasRef.handler.drawingHandler.photspot.init();
            } else {
				canvasRef.handler.drawingHandler.polygon.init();
			}
		},
		onChangeActiveKey: activeKey => {
			this.setState({
				activeKey,
			});
		},
		onCollapse: () => {
			this.setState({
				collapse: !this.state.collapse,
			});
		},
		onSearchNode: e => {
			const filteredDescriptors = this.handlers
				.transformList()
				.filter(descriptor => descriptor.name.toLowerCase().includes(e.target.value.toLowerCase()));
			this.setState({
				textSearch: e.target.value,
				filteredDescriptors,
			});
		},
		transformList: () => {
			return Object.values(this.props.descriptors).reduce((prev, curr) => prev.concat(curr), []);
		},
		onSVGModalVisible: () => {
			this.setState(prevState => {
				return {
					svgModalVisible: !prevState.svgModalVisible,
				};
			});
		},
	};

	events = {
		onDragStart: (e, item) => {
			this.item = item;
			const { target } = e;
            target.classList.add('dragging');
		},
		onDragOver: e => {
			if (e.preventDefault) {
				e.preventDefault();
			}
            e.dataTransfer.dropEffect = 'copy';
			return false;
		},
		onDragEnter: e => {
			const { target } = e;
            target.classList.add('over');
		},
		onDragLeave: e => {
			const { target } = e;
            target.classList.remove('over');
		},
		onDrop: e => {
			e = e || window.event;
			if (e.preventDefault) {
				e.preventDefault();
			}
			if (e.stopPropagation) {
				e.stopPropagation();
            }
			const { layerX, layerY } = e;
			const dt = e.dataTransfer;
			if (dt.types.length && dt.types[0] === 'Files') {
				const { files } = dt;
				Array.from(files).forEach(file => {
					file.uid = v4();
					const { type } = file;
					if (type === 'image/png' || type === 'image/jpeg' || type === 'image/jpg') {
						const item = {
							option: {
								type: 'image',
								file,
								left: layerX,
								top: layerY,
							},
						};
						this.handlers.onAddItem(item, false);
					} else {
						notification.warn({
							message: 'Not supported file type',
						});
					}
				});
				return false;
			}
			const option = Object.assign({}, this.item.option, { left: layerX, top: layerY });
			const newItem = Object.assign({}, this.item, { option });
			this.handlers.onAddItem(newItem, false);
			return false;
		},
		onDragEnd: e => {
			this.item = null;
            e.target.classList.remove('dragging');
		},
	};

	renderItems = items => (
		<Flex flexWrap="wrap" flexDirection="column" style={{ width: '100%' }}>
			{items.map(item => this.renderItem(item))}
		</Flex>
	);
	renderItem = (item, centered) =>
		(item.type === 'drawing' || item.option.type === 'photspot') ? (
			<div
				key={item.name}
				draggable
				onClick={e => this.handlers.onDrawingItem(item)}
				className="rde-editor-items-item"
				style={{ justifyContent: this.state.collapse ? 'center' : null }}
			>
				<span className="rde-editor-items-item-icon">
					<Icon name={item.icon.name} prefix={item.icon.prefix} style={item.icon.style} />
				</span>
				{this.state.collapse ? null : <div className="rde-editor-items-item-text">{item.name}</div>}
			</div>
		) : (
			<div
				key={item.name}
				draggable
				onClick={e => this.handlers.onAddItem(item, centered)}
				onDragStart={e => this.events.onDragStart(e, item)}
				onDragEnd={e => this.events.onDragEnd(e, item)}
				className="rde-editor-items-item"
				style={{ justifyContent: this.state.collapse ? 'center' : null }}
			>
				<span className="rde-editor-items-item-icon">
					<Icon name={item.icon.name} prefix={item.icon.prefix} style={item.icon.style} />
				</span>
				{this.state.collapse ? null : <div className="rde-editor-items-item-text">{item.name}</div>}
			</div>
        );
    getAllFromS3 = (bucket) => {
        const params = {
            Bucket: bucket.bucketName
        };
        this.myBucket.listObjects(params, (err, data) => {
            if (err) {} // an error occurred
            else {
				let mediaList = [];
                data.Contents.forEach((object, i) => {
                    const newFile = {
                        "_id": i + 1,
                        "title": object.Owner.DisplayName,
                        "size": object.size,
                        "fileName": object.Key,
                        "type": "image/jpeg",
                        "createdAt": new Date(),
                        "thumbnailUrl": getThumbnailUrl(s3, object.Key)
					}
					mediaList.push(newFile);
				})
				this.setState({fileLibraryList: mediaList})
                this.forceUpdate();
            }
        })
    }
    getAllImages = () => {
        axios.get(`${API_URL}/images`)
        .then(res => {
            let mediaList = [];
            res.data.forEach(img => {
                const { image_file } = img;
                if (!image_file) return;
                const { id, caption, size, name, mime, created_at, url } = image_file;
                const newFile = {
                    "_id": id,
                    "title": caption,
                    "size": size,
                    "fileName": name,
                    "type": mime,
                    "createdAt": new Date(created_at),
                    "thumbnailUrl": url.replace("https", "http").replace("s3.us-west-2.amazonaws.com/", "")
                }
                mediaList.push(newFile);
            })
            this.setState({fileLibraryList: mediaList})
            this.forceUpdate();
        })
    }
    uploadFileToS3 = (fileBase64, fileMeta) => {
        const buf = Buffer.from(fileBase64.replace(/^data:image\/\w+;base64,/, ""),'base64');
        const params = {
            ACL: 'public-read',
            Key: fileMeta.fileName,
            ContentType: fileMeta.type,
            Body: buf,
            ContentEncoding: 'base64'
        };
        this.myBucket.putObject(params)
            .on('httpUploadProgress', (evt) => {
            })
            .send((err) => {
                if (err) {
                } else {
                    const { fileLibraryList } = this.state;
                    let isDuplicated = false;
                    for (let i = 0; i < fileLibraryList.length; i++) {
                        const e = fileLibraryList[i];
                        if (e.fileName === fileMeta.fileName) {
                            isDuplicated = true;
                            break;
                        }
                        
                    }
                    const newFile = {
                        "_id": fileLibraryList.length + 1,
                        "title": fileMeta.fileName,
                        "size": fileMeta.size,
                        "fileName": fileMeta.fileName,
                        "type": "image/jpeg",
                        "createdAt": new Date(),
                        "thumbnailUrl": getThumbnailUrl(s3, fileMeta.fileName)
                    }
                    if (!isDuplicated) {
                        this.setState({fileLibraryList: [...fileLibraryList, newFile]});
                        this.forceUpdate();
                    }
                }
            })
        }
    uploadCallback = async (fileBase64, fileMeta) => {
        /* convert fileBase64 to File object */
        var arr = fileBase64.split(','),
            mime = arr[0].match(/:(.*?);/)[1],
            bstr = atob(arr[1]), 
            n = bstr.length, 
            u8arr = new Uint8Array(n);
            
        while(n--){
            u8arr[n] = bstr.charCodeAt(n);
        }
        const file = new File([u8arr], fileMeta.fileName, {type:mime});
        /* ---------------------------------------------- */
        let formData = new FormData();
		formData.append('files.image_file', file, fileMeta.fileName);
		formData.append('data', JSON.stringify({}));
        const res = await axios({
            method: 'post',
            url: `${API_URL}/images`,
            data: formData,
            headers: {'Content-Type': 'multipart/form-data' }
        });
        if (res.statusText === "OK") {
            const { image_file } = res.data;
            if (!image_file) return;
            const { id, caption, size, name, mime, created_at, url } = image_file;
            const newFile = {
                "_id": id,
                "title": caption,
                "size": size,
                "fileName": name,
                "type": mime,
                "createdAt": new Date(created_at),
                "thumbnailUrl": url.replace("https", "http").replace("s3.us-west-2.amazonaws.com/", "")
            };
            const { fileLibraryList } = this.state;
            this.setState({fileLibraryList: [...fileLibraryList, newFile]});
            this.forceUpdate();
            return true;
        }
        return false;
    }
    deleteCallback = async (item) => {
    }
    selectCallback = (item) => {
        const { canvasRef } = this.props;
        const { imageItem, centered } = this.state;
        this.setState({rmlDisplay: false});
        const id = v4();
        let option = Object.assign({}, imageItem.option, { id });
        option.src = item.thumbnailUrl;
        canvasRef.handler.add(option, centered);
        this.forceUpdate();
    }
	render() {
		const { descriptors } = this.props;
		const { collapse, textSearch, filteredDescriptors, activeKey, svgModalVisible, svgOption, rmlDisplay, fileLibraryList } = this.state;
		const className = classnames('rde-editor-items', {
			minimize: collapse,
		});
		return (
			<div className={className}>
				<Flex flex="1" flexDirection="column" style={{ height: '100%' }}>
					<Flex justifyContent="center" alignItems="center" style={{ height: 40 }}>
						<CommonButton
							icon={collapse ? 'angle-double-right' : 'angle-double-left'}
							shape="circle"
							className="rde-action-btn"
							style={{ margin: '0 4px' }}
							onClick={this.handlers.onCollapse}
						/>
						{collapse ? null : (
							<Input
								style={{ margin: '8px' }}
								placeholder={i18n.t('action.search-list')}
								onChange={this.handlers.onSearchNode}
								value={textSearch}
								allowClear
							/>
						)}
					</Flex>
					<Scrollbar>
						<Flex flex="1" style={{ overflowY: 'hidden' }}>
							{(textSearch.length && this.renderItems(filteredDescriptors)) ||
								(collapse ? (
									<Flex
										flexWrap="wrap"
										flexDirection="column"
										style={{ width: '100%' }}
										justifyContent="center"
									>
										{this.handlers.transformList().map(item => this.renderItem(item))}
									</Flex>
								) : (
									<Collapse
										style={{ width: '100%' }}
										bordered={false}
										activeKey={activeKey.length ? activeKey : Object.keys(descriptors)}
										onChange={this.handlers.onChangeActiveKey}
									>
										{Object.keys(descriptors).map(key => (
											<Collapse.Panel key={key} header={key} showArrow={!collapse}>
												{this.renderItems(descriptors[key])}
											</Collapse.Panel>
										))}
									</Collapse>
								))}
						</Flex>
					</Scrollbar>
				</Flex>
				<SVGModal
					visible={svgModalVisible}
					onOk={this.handlers.onAddSVG}
					onCancel={this.handlers.onSVGModalVisible}
					option={svgOption}
				/>
                <ReactMediaLibrary
                    show={rmlDisplay}
                    onHide={() => {
                        this.setState({rmlDisplay: false});
                        this.forceUpdate();
                    }}
                    fileUploadCallback={this.uploadCallback}
                    fileLibraryList={fileLibraryList}
                    fileSelectCallback={this.selectCallback}
                    fileDeleteCallback={this.deleteCallback}
                />
			</div>
		);
	}
}

export default ImageMapItems;
