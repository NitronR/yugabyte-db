// Copyright (c) YugaByte, Inc.

import React, { useEffect, useState } from 'react';
import * as Yup from 'yup';
import { toast } from 'react-toastify';
import { Row, Col } from 'react-bootstrap';
import { Formik, Form, Field } from 'formik';
import { YBFormInput, YBButton, YBModal, YBToggle } from '../../common/forms/fields';
import YBInfoTip from '../../common/descriptors/YBInfoTip';
import WarningIcon from '../icons/warning_icon';

const VALIDATION_SCHEMA = Yup.object().shape({
  ldap_url: Yup.string()
    .matches(/^(?:http(s)?:\/\/)?[\w.-]+(?:[\w-]+)+:\d{1,5}$/, {
      message: 'LDAP URL must be a valid URL with port number'
    })
    .required('LDAP URL is Required'),
  ldap_basedn: Yup.string().required('LDAP Base DN is required')
});

const LDAP_PATH = 'yb.security.ldap';

const TOAST_OPTIONS = { autoClose: 1750 };

export const LDAPAuth = (props) => {
  const {
    fetchRunTimeConfigs,
    setRunTimeConfig,
    runtimeConfigs: {
      data: { configEntries }
    },
    isTabsVisible
  } = props;
  const [showToggle, setToggleVisible] = useState(false);
  const [dialog, showDialog] = useState(false);
  const [ldapEnabled, setLDAP] = useState(false);

  const transformData = (values) => {
    const splittedURL = values.ldap_url.split(':');
    const ldap_port = splittedURL[splittedURL.length - 1];
    const ldap_url = values.ldap_url.replace(`:${ldap_port}`, '');
    return {
      ...values,
      ldap_url: ldap_url ?? '',
      ldap_port: ldap_port ?? ''
    };
  };

  const initializeFormValues = () => {
    const ldapConfigs = configEntries.filter((config) => config.key.includes(LDAP_PATH));
    const formData = ldapConfigs.reduce((fData, config) => {
      const [, key] = config.key.split(`${LDAP_PATH}.`);
      fData[key] = config.value;
      return fData;
    }, {});

    return {
      ...formData,
      ldap_url: formData.ldap_url ? [formData.ldap_url, formData.ldap_port].join(':') : ''
    };
  };

  const saveLDAPConfigs = async (values) => {
    const formValues = transformData(values);
    const promiseArray = Object.keys(formValues).reduce((promiseArr, key) => {
      if (formValues[key] !== '' && formValues[key] !== '')
        promiseArr.push(
          setRunTimeConfig({
            key: `${LDAP_PATH}.${key}`,
            value: formValues[key]
          })
        );

      return promiseArr;
    }, []);

    //enable ldap on save
    promiseArray.push(
      setRunTimeConfig({
        key: `${LDAP_PATH}.use_ldap `,
        value: true
      })
    );

    try {
      toast.warn('Please wait. LDAP configuration is getting saved', TOAST_OPTIONS);
      const response = await Promise.all(promiseArray);
      response && fetchRunTimeConfigs();
      toast.success('LDAP configuration is saved successfully', TOAST_OPTIONS);
    } catch {
      toast.error('Failed to save LDAP configuration', TOAST_OPTIONS);
    }
  };

  const handleToggle = async (e) => {
    const value = e.target.checked;

    if (!value) showDialog(true);
    else {
      setLDAP(true);
      await setRunTimeConfig({
        key: `${LDAP_PATH}.use_ldap`,
        value: true
      });
      toast.success(`LDAP authentication is enabled`, TOAST_OPTIONS);
    }
  };

  const handleDialogClose = () => {
    showDialog(false);
  };

  const handleDialogSubmit = async () => {
    setLDAP(false);
    showDialog(false);
    await setRunTimeConfig({
      key: `${LDAP_PATH}.use_ldap`,
      value: false
    });
    toast.warn(`LDAP authentication is disabled`, TOAST_OPTIONS);
  };

  useEffect(() => {
    const ldapConfig = configEntries.find((config) => config.key.includes(`${LDAP_PATH}.use_ldap`));
    setToggleVisible(!!ldapConfig);
    setLDAP(ldapConfig?.value === 'true');
  }, [configEntries, setToggleVisible, setLDAP]);

  return (
    <div className="bottom-bar-padding">
      <YBModal
        title="Disable LDAP"
        visible={dialog}
        showCancelButton={true}
        submitLabel="Disable LDAP"
        cancelLabel="Cancel"
        cancelBtnProps={{
          className: 'btn btn-default pull-left ldap-cancel-btn'
        }}
        onHide={handleDialogClose}
        onFormSubmit={handleDialogSubmit}
      >
        <div className="ldap-modal-c">
          <div className="ldap-modal-c-icon">
            <WarningIcon />
          </div>
          <div className="ldap-modal-c-content">
            <b>Note!</b> Users authenticated via LDAP will no longer be able to login if you disable
            LDAP. Are you sure?
          </div>
        </div>
      </YBModal>
      <Col>
        <Formik
          validationSchema={VALIDATION_SCHEMA}
          initialValues={initializeFormValues()}
          enableReinitialize
          onSubmit={(values, { setSubmitting, resetForm }) => {
            saveLDAPConfigs(values);
            setSubmitting(false);
            resetForm(values);
          }}
        >
          {({ handleSubmit, isSubmitting, values, dirty }) => {
            const isDisabled = !ldapEnabled && showToggle;
            const isSaveDisabled = !dirty;
            return (
              <Form name="LDAPConfigForm" onSubmit={handleSubmit}>
                <Row className="ua-field-row">
                  <Col lg={2} className="ua-label-c ua-title-c">
                    {!isTabsVisible && <h5>LDAP Configuration</h5>}
                  </Col>
                  <Col lg={7} sm={10} className="ua-toggle-c">
                    {showToggle && (
                      <>
                        <Col className="ua-toggle-label-c">
                          LDAP Enabled &nbsp;
                          <YBInfoTip
                            title="LDAP Enabled"
                            content="Enable or Disable LDAP Authentication"
                          >
                            <i className="fa fa-info-circle" />
                          </YBInfoTip>
                        </Col>

                        <YBToggle
                          onToggle={handleToggle}
                          name="use_ldap"
                          input={{
                            value: ldapEnabled,
                            onChange: () => {}
                          }}
                        />
                      </>
                    )}
                  </Col>
                </Row>

                <Row className="ua-field-row" key="ldap_url">
                  <Col lg={2} className="ua-label-c">
                    <div>
                      LDAP URL &nbsp;
                      <YBInfoTip
                        title="LDAP URL"
                        content="LDAP URL must be a valid URL with port number, Ex:- http://0.0.0.0:0000"
                      >
                        <i className="fa fa-info-circle" />
                      </YBInfoTip>
                    </div>
                  </Col>
                  <Col lg={7} sm={10}>
                    <Field
                      name="ldap_url"
                      component={YBFormInput}
                      disabled={isDisabled}
                      className="ua-form-field"
                    />
                  </Col>
                </Row>

                <Row className="ua-field-row" key="ldap_basedn">
                  <Col lg={2} className="ua-label-c">
                    <div>
                      LDAP Base DN &nbsp;
                      <YBInfoTip
                        title="LDAP Base DN"
                        content="Base of the DN for LDAP queries. Will be appended to the user name at login time to query the LDAP server"
                      >
                        <i className="fa fa-info-circle" />
                      </YBInfoTip>
                    </div>
                  </Col>
                  <Col lg={7} sm={10}>
                    <Field
                      name="ldap_basedn"
                      component={YBFormInput}
                      disabled={isDisabled}
                      className="ua-form-field"
                    />
                  </Col>
                </Row>

                <Row className="ua-field-row" key="ldap_dn_prefix">
                  <Col lg={2} className="ua-label-c">
                    <div>
                      LDAP DN Prefix &nbsp;
                      <YBInfoTip
                        title="LDAP DN Prefix"
                        content="LDAP DN Prefix will be set to CN= by default if not provided"
                      >
                        <i className="fa fa-info-circle" />
                      </YBInfoTip>
                    </div>
                  </Col>
                  <Col lg={7} sm={10}>
                    <Field
                      name="ldap_dn_prefix"
                      component={YBFormInput}
                      disabled={isDisabled}
                      className="ua-form-field"
                    />
                  </Col>
                </Row>

                <Row className="ua-field-row" key="ldap_customeruuid">
                  <Col lg={2} className="ua-label-c">
                    <div>
                      LDAP Customer UUID (Optional) &nbsp;
                      <YBInfoTip
                        title="LDAP Customer UUID"
                        content="Unique ID of the customer in case of multi-tenant platform"
                      >
                        <i className="fa fa-info-circle" />
                      </YBInfoTip>
                    </div>
                  </Col>
                  <Col lg={7} sm={10}>
                    <Field
                      name="ldap_customeruuid"
                      component={YBFormInput}
                      disabled={isDisabled}
                      className="ua-form-field"
                    />
                  </Col>
                </Row>

                <br />

                <Row className="ua-field-row">
                  <Col lg={2} className="ua-label-c" />
                  <Col lg={7} sm={10} className="ua-action-c">
                    <YBButton
                      btnText="Save"
                      btnType="submit"
                      disabled={isSubmitting || isDisabled || isSaveDisabled}
                      btnClass="btn btn-orange pull-right"
                    />
                  </Col>
                </Row>
              </Form>
            );
          }}
        </Formik>
      </Col>
    </div>
  );
};
