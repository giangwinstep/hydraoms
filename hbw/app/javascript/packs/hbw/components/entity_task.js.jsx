import { withCallbacks } from './helpers';

modulejs.define(
  'HBWEntityTask',
  ['React', 'ReactDOM', 'jQuery', 'HBWForm', 'HBWTestForm', 'HBWError', 'HBWPending',
    'HBWFormDefinition'],
  (React, ReactDOM, jQuery, Form, TestForm, Error, Pending, FormDefinition) => {
    class HBWEntityTask extends React.Component {
      state = {
        error:     null,
        loading:   true,
        pending:   null,
        form:      null,
        collapsed: this.props.collapsed || false,
        id:        this.props.getComponentId()
      };

      componentDidMount () {
        this.loadForm(this.props.task.id);
        this.props.bind(`hbw:submit-form-${this.state.id}`, this.submitForm);

        const e = jQuery(this.rootNode);
        e.on('hidden.bs.collapse', this.choose);
        e.on('shown.bs.collapse', this.choose);
      }

      componentWillUnmount () {
        jQuery(this.rootNode).off('hidden.bs.collapse').off('shown.bs.collapse');
      }

      render () {
        let iconClass = 'indicator pull-right fa';

        const { task } = this.props;

        if (this.state.collapsed) {
          iconClass += ' fa-chevron-down';
        } else {
          iconClass += ' fa-chevron-up';
        }

        return <div className="panel panel-default" ref={(node) => { this.rootNode = node; }}>
          <div className="panel-heading">
            <h4 className="panel-title collapsable">
              <a
                onClick={this.toggleCollapse}
              >
                {task.name}
              </a>
              <i
                onClick={this.toggleCollapse}
                className={iconClass}
              />
            </h4>
          </div>
          {!this.state.collapsed
            && (<div className="panel-body">
                {this.renderForm()}
                </div>)
          }
        </div>;
      }

      renderForm = () => {
        if (this.state.form) {
          const opts = {
            id:        this.state.id,
            taskId:    this.props.task.id,
            form:      this.state.form,
            env:       this.props.env,
            error:     this.state.error,
            pending:   this.state.pending,
            assignee:  this.props.task.assignee,
            variables: this.formVariablesFromTask(this.props.task),
            pollTasks: this.props.pollTasks
          };

          return <Form {...opts}/>;
        } if (this.state.error) {
          return <Error error={this.state.error} env={this.props.env} />;
        }
        return <Pending active={this.state.loading} />;
      };

      formVariablesFromTask = () => {
        const formVariables = {};
        const formDef = new FormDefinition(this.state.form);

        [...this.state.form.variables].forEach(({ name, value }) => {
          if (formDef.fieldExist(name)) {
            formVariables[name] = value;
          }
        });

        return formVariables;
      };

      loadForm = (taskId) => {
        this.setState({ loading: true });

        this.props.env.forms.fetch(taskId)
          .done(form => this.setState({
            error: null,
            form
          }))
          .done(() => this.props.trigger('hbw:form-loaded', { entityCode: this.props.entityCode }))
          .fail(response => this.setState({ error: response }))
          .always(() => this.setState({ loading: false }));
      };

      submitForm = (variables) => {
        this.setState({ pending: true });

        this.props.env.forms.save({
          taskId: this.props.taskId,
          variables,
          token:  this.state.form.csrf_token
        })
          .done(() => this.setState({ error: null }))
          .done(() => this.props.trigger('hbw:form-submitted', this.props.task))
          .fail((response) => {
            this.setState({ error: response });
            return this.props.trigger('hbw:form-submitting-failed', {
              response,
              task: this.props.task
            });
          })
          .always(() => this.setState({ pending: false }));
      };

      choose = () => {
        this.props.trigger('hbw:task-clicked', this.props.task);
      };

      toggleCollapse = () => {
        this.setState(prevState => ({ collapsed: !prevState.collapsed }));
      };
    }

    return withCallbacks(HBWEntityTask);
  }
);
