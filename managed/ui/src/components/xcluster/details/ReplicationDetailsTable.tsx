import React, { useState } from 'react';
import { Col, Row } from 'react-bootstrap';
import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { closeDialog, openDialog } from '../../../actions/modal';
import {
  editXClusterTables,
  fetchTablesInUniverse,
  getUniverseInfo
} from '../../../actions/xClusterReplication';
import { YBButton } from '../../common/forms/fields';
import { IReplication, IReplicationTable } from '../IClusterReplication';
import { GetCurrentLagForTable, YSQL_TABLE_TYPE } from '../ReplicationUtils';
import DeleteReplicactionTableModal from './DeleteReplicactionTableModal';

import './ReplicationDetailsTable.scss';
interface props {
  replication: IReplication;
}

export function ReplicationDetailsTable({ replication }: props) {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();

  const [deleteTableDetails, setDeleteTableDetails] = useState<IReplicationTable>();

  const showAddTablesToClusterModal = () => {
    dispatch(openDialog('addTablesToClusterModal'));
  };

  const { data: tablesInSourceUniverse, isLoading: isTablesLoading } = useQuery(
    [replication.sourceUniverseUUID, 'tables'],
    () => fetchTablesInUniverse(replication.sourceUniverseUUID).then((res) => res.data)
  );

  const { data: universeInfo, isLoading: currentUniverseLoading } = useQuery(
    ['universe', replication.sourceUniverseUUID],
    () => getUniverseInfo(replication.sourceUniverseUUID)
  );

  const removeTableFromXCluster = useMutation(
    (replication: IReplication) => {
      return editXClusterTables(replication);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['Xcluster', replication.uuid]);
        dispatch(closeDialog());
        toast.success(`${deleteTableDetails?.tableName} table removed successfully`);
      },
      onError: (err: any) => {
        toast.error(err.response.data.error);
      }
    }
  );

  if (isTablesLoading || currentUniverseLoading) {
    return null;
  }

  const tablesInReplication = tablesInSourceUniverse
    .map((tables: IReplicationTable) => {
      return {
        ...tables,
        tableUUID: tables.tableUUID.replaceAll('-', '')
      };
    })
    .filter((table: IReplicationTable) => replication.tables.includes(table.tableUUID));

  const isActiveTab = window.location.search === '?tab=tables';

  return (
    <>
      <div className="replication-divider" />
      <Row>
        <Col lg={6}>
          {tablesInReplication.length} of {tablesInSourceUniverse.length} tables replicated
        </Col>
        <Col lg={6}>
          <div style={{ float: 'right' }}>
            <YBButton
              onClick={showAddTablesToClusterModal}
              btnText={
                <>
                  <i className="fa fa-plus" />
                  Add Tables
                </>
              }
            />
          </div>
        </Col>
      </Row>
      <div className="replication-divider" />
      <Row>
        <Col lg={12}>
          <div className="replication-table">
            <BootstrapTable
              data={tablesInReplication}
              height={'300'}
              tableContainerClass="add-to-table-container"
            >
              <TableHeaderColumn dataField="tableUUID" isKey={true} hidden />
              <TableHeaderColumn dataField="tableName" width="30%">
                Name
              </TableHeaderColumn>
              <TableHeaderColumn
                dataField="tableType"
                width="20%"
                dataFormat={(cell) => {
                  if (cell === YSQL_TABLE_TYPE) return 'YSQL';
                  return 'YCQL';
                }}
              >
                Type
              </TableHeaderColumn>
              <TableHeaderColumn dataField="keySpace" width="20%">
                Keyspace
              </TableHeaderColumn>
              <TableHeaderColumn dataField="sizeBytes" width="10%">
                Size
              </TableHeaderColumn>
              <TableHeaderColumn
                dataFormat={(_cell, row) => (
                  <span className="lag-text">
                    <GetCurrentLagForTable
                      replicationUUID={replication.uuid}
                      tableName={row.tableName}
                      nodePrefix={universeInfo?.data.universeDetails.nodePrefix}
                      enabled={isActiveTab}
                    />
                  </span>
                )}
              >
                Current lag (ms)
              </TableHeaderColumn>
              <TableHeaderColumn
                dataField="action"
                width="10%"
                dataFormat={(_, row) => (
                  <YBButton
                    btnText="Remove Table"
                    onClick={() => {
                      setDeleteTableDetails(row);
                      dispatch(openDialog('DeleteReplicationTableModal'));
                    }}
                  />
                )}
                thStyle={{
                  textAlign: 'center'
                }}
              >
                Action
              </TableHeaderColumn>
            </BootstrapTable>
          </div>
        </Col>
        <DeleteReplicactionTableModal
          deleteTableName={deleteTableDetails?.tableName ?? ''}
          onConfirm={() => {
            removeTableFromXCluster.mutate({
              ...replication,
              tables: replication.tables.filter((t) => t !== deleteTableDetails!.tableUUID)
            });
          }}
          onCancel={() => {
            dispatch(closeDialog());
          }}
        />
      </Row>
    </>
  );
}
