import React, { Component } from 'react';
import i18n from 'i18next';
import { v4 } from 'uuid';
import { CommonButton } from '../../common';
import Scrollbar from '../../common/Scrollbar';
import './PageListPanel.css'

class Page extends Component {
    constructor(props) {
        super(props);
    }
    render() {
        const { id, active, onPageClick, onDeleteClick, pageCount, getPreviewImgById, onDuplicateClick } = this.props;
        // const img = getPreviewImgById(id);
        return <div className="panel-list-item">
            <div
                className={`panel-list-item-page ${active ? "border-green" : "border-black"}`}
                onClick={() => onPageClick(id)}
            >
                {/* <img className="panel-list-item-page-preview" src={img} /> */}
                {id}
            </div>
            <div className="panel-list-item-btn-group">
                {(pageCount !== 1) &&
                    <CommonButton
                        className="rde-action-btn"
                        shape="circle"
                        icon="trash"
                        tooltipTitle={i18n.t('action.delete')}
                        onClick={() => onDeleteClick(id)}
                    />
                }
                {active &&
                    <CommonButton
                        className="rde-action-btn"
                        shape="circle"
                        icon="clone"
                        tooltipTitle={i18n.t('Duplicate')}
                        onClick={() => onDuplicateClick(id)}
                    />
                }
            </div>
            
        </div>
    }
}

class PageListPanel extends Component {
    constructor(props) {
        super(props);
        const { onPanelStateChange } = this.props;
        onPanelStateChange('init');
    }
    onPageClick = (id) => {
        const { onPanelStateChange } = this.props;
        onPanelStateChange('page-change', id);
    }
    onDeleteClick = (id) => {
        const { onPanelStateChange } = this.props;
        onPanelStateChange('delete', id);
    }
    onAddClick = () => {
        const { onPanelStateChange } = this.props;
        onPanelStateChange('add');
    }
    onDuplicateClick = (id) => {
        const { onPanelStateChange } = this.props;
        onPanelStateChange('duplicate', id);
    }
    render() {
        const { pages, curPageId } = this.props;
        const { getPreviewImgById } = this.props;
        return <div className="rde-editor-items panel-list">
                <Scrollbar>
                    <div>
                        <div className="panel-header">
                            <CommonButton
                                className="rde-action-btn"
                                shape="circle"
                                icon="plus"
                                tooltipTitle={i18n.t('action.add')}
                                onClick={this.onAddClick}
                            />
                        </div>
                        <div>
                            {
                                pages.map(page =>
                                    <Page
                                        id={page.id}
                                        key={page.id}
                                        active={ page.id === curPageId }
                                        onPageClick={this.onPageClick}
                                        onDeleteClick={this.onDeleteClick}
                                        pageCount={pages.length}
                                        getPreviewImgById={getPreviewImgById}
                                        onDuplicateClick={this.onDuplicateClick}
                                    />)
                            }
                        </div>
                    </div>
                </Scrollbar>
            </div>
    }
    
}

export default PageListPanel;
