import React, { Component } from 'react';
import { Helmet } from 'react-helmet';
import axios from 'axios';

import ImageMapEditor from '../components/imagemap/ImageMapEditor';
import WorkflowEditor from '../components/workflow/WorkflowEditor';
import Title from './Title';
import FlowEditor from '../components/flow/FlowEditor';
import FlowContainer from './FlowContainer';
import HexGrid from '../components/hexgrid/HexGrid';
import Projects from '../components/projects/Projects';
import { API_URL } from '../config/env';

type EditorType = 'imagemap' | 'workflow' | 'flow' | 'hexgrid' | 'projects';

interface IState {
    activeEditor?: EditorType;
    projectId: any;
    projects: any;
    projectName: any;
}

class App extends Component<any, IState> {
	state: IState = {
        activeEditor: 'projects',
        projectId: null,
        projects: [],
        projectName: null
	};
    componentDidMount() {
        axios.get(`${API_URL}/projects`)
        .then(res => {
            this.setState({projects: res.data});
        })
    }
	onChangeMenu = ({ key }) => {
        if (key === 'projects') {
            axios.get(`${API_URL}/projects`)
            .then(res => {
                this.setState({projects: res.data});
            })
        }
		this.setState({
			activeEditor: key,
		});
    };
    
    onProjectClick = (id) => () => {
        const { projects } = this.state;
        let projectName = null;
        for (let i = 0; i < projects.length; i++) {
            const e = projects[i];
            if (e.id === id) {
                projectName = e.name;
                break;
            }
        }
        this.setState({
            activeEditor: "imagemap",
            projectId: id,
            projectName
        })
    }

    onAddProjectClick = (projectName) => () => {
        axios.post(`${API_URL}/projects`,
        {
            name: projectName
        })
        .then(res => {
            const { projects } = this.state;
            this.setState({projects: [...projects, res.data]});
        })
    }

    onProjectNameChange = (projectName) => {
        this.setState({projectName});
    }

    onDeleteProjectClick = async (id) => {
        await axios.delete(`${API_URL}/projects/${id}`);
        const { projects } = this.state;
        const newProjects = projects.filter(project => project.id !== id)
        this.setState({projects: [...newProjects]});
        return true;
    }

    onDuplicateProjectClick = async (id) => {
        const res = await axios.get(`${API_URL}/projects/${id}`);
        const { name, project_json } = res.data;
        const copiedProject = await axios.post(`${API_URL}/projects`, {
            name: `<${name}> Copy`,
            project_json
        });
        const { projects } = this.state;
        this.setState({projects: [...projects, copiedProject.data]});
        return true;
    }

	renderEditor = (activeEditor: EditorType) => {
        const { projects, projectId } = this.state;
        let imageMapProps = {};
        if (projectId) {
            imageMapProps = { projectId };
        }
		switch (activeEditor) {
			case 'imagemap':
                return <ImageMapEditor
                        onProjectNameChange={this.onProjectNameChange}
                        {...imageMapProps} />;
			case 'workflow':
				return <WorkflowEditor />;
			case 'flow':
				return <FlowEditor />;
			case 'hexgrid':
                return <HexGrid />;
            case 'projects':
                return <Projects
                    projects={projects}
                    onProjectClick={this.onProjectClick}
                    onAddProjectClick={this.onAddProjectClick}
                    onDeleteProjectClick={this.onDeleteProjectClick}
                    onDuplicateProjectClick={this.onDuplicateProjectClick}
                    />;
		}
	};

	render() {
		const { activeEditor, projectName } = this.state;
		return (
			<div className="rde-main">
				<Helmet>
					<meta charSet="utf-8" />
					<meta name="viewport" content="width=device-width, initial-scale=1.0" />
					<meta
						name="description"
						content="React Design Editor has started to developed direct manipulation of editable design tools like Powerpoint, We've developed it with react.js, ant.design, fabric.js "
					/>
					<link rel="manifest" href="./manifest.json" />
					<link rel="shortcut icon" href="./favicon.ico" />
					<link rel="stylesheet" href="https://fonts.googleapis.com/earlyaccess/notosanskr.css" />
					<title>React Design Editor</title>
					<script async={true} src="https://www.googletagmanager.com/gtag/js?id=UA-97485289-3" />
					<script>
						{`
                        window.dataLayer = window.dataLayer || [];
                        function gtag(){dataLayer.push(arguments);}
                        gtag('js', new Date());
                        gtag('config', 'UA-97485289-3');
                        `}
					</script>
					<script async={true} src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js" />
				</Helmet>
				<div className="rde-title">
					<Title onChangeMenu={this.onChangeMenu} current={activeEditor} projectName={projectName} />
				</div>
				<FlowContainer>
					<div className="rde-content">{this.renderEditor(activeEditor)}</div>
				</FlowContainer>
			</div>
		);
	}
}

export default App;
